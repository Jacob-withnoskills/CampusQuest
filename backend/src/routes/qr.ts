
import {
    createHash,
    randomBytes
} from 'node:crypto';

import type { FastifyInstance } from 'fastify';
import { pool } from '../db.js';
import { authenticateTeam } from '../auth-middleware.js';

function hashToken(token: string): string {
    return createHash('sha256')
        .update(token)
        .digest('hex');
}

export async function qrRoutes(app: FastifyInstance) {

    // POST: Create a QR checkpoint
    app.post<{
        Body: {
            challengeId: number;
            checkpointName: string;
        };
    }>('/checkpoints', async (request, reply) => {

        const { challengeId, checkpointName } = request.body ?? {};

        if (
            !Number.isSafeInteger(challengeId) ||
            challengeId <= 0 ||
            typeof checkpointName !== 'string' ||
            checkpointName.trim().length < 2 ||
            checkpointName.trim().length > 100
        ) {
            return reply.code(400).send({
                message: 'Valid challenge ID and checkpoint name are required.'
            });
        }

        try {
            // Verify that the challenge belongs to an active round
            // and is itself active.
            const challenge = await pool.query(
                `SELECT c.id
         FROM challenges c
         INNER JOIN rounds r ON r.id = c.round_id
         WHERE c.id = $1
           AND c.is_active = TRUE
           AND r.status = 'ACTIVE'`,
                [challengeId]
            );

            if (challenge.rowCount === 0) {
                return reply.code(409).send({
                    message: 'Challenge must be active and belong to an active round.'
                });
            }

            // Generate a cryptographically secure random token.
            const token = randomBytes(32).toString('hex');

            // Store only the SHA-256 hash.
            const tokenHash = hashToken(token);

            const result = await pool.query(
                `INSERT INTO qr_checkpoints
          (challenge_id, checkpoint_name, token_hash, is_active)
         VALUES ($1, $2, $3, TRUE)
         RETURNING id, challenge_id AS "challengeId",
                   checkpoint_name AS "checkpointName",
                   is_active AS "isActive", created_at AS "createdAt"`,
                [challengeId, checkpointName.trim(), tokenHash]
            );

            return reply.code(201).send({
                message: 'QR checkpoint created successfully.',
                checkpoint: result.rows[0],
                token
            });

        } catch (error) {
            app.log.error({ err: error }, 'QR checkpoint creation failed');

            return reply.code(500).send({
                message: 'Unable to create QR checkpoint.'
            });
        }
    });

    // POST: Scan a QR checkpoint
    app.post<{
        Body: {
            token: string;
        };
    }>('/scan', {
        preHandler: authenticateTeam
    }, async (request, reply) => {

        const team = request.team;
        const { token } = request.body ?? {};

        if (!team) {
            return reply.code(401).send({
                message: 'Authentication required.'
            });
        }

        if (
            typeof token !== 'string' ||
            token.length !== 64 ||
            !/^[a-f0-9]{64}$/i.test(token)
        ) {
            return reply.code(400).send({
                message: 'Invalid QR token.'
            });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Verify that the team still exists and is active.
            const teamResult = await client.query(
                `SELECT id
         FROM teams
         WHERE id = $1 AND is_active = TRUE
         FOR UPDATE`,
                [team.teamId]
            );

            if (teamResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return reply.code(403).send({
                    message: 'Team is inactive or no longer exists.'
                });
            }

            // Find an active QR checkpoint belonging to an active challenge
            // in the currently active round.
            const tokenHash = hashToken(token);

            const checkpointResult = await client.query(
                `SELECT
           q.id,
           q.checkpoint_name,
           c.title,
           r.id AS round_id
         FROM qr_checkpoints q
         INNER JOIN challenges c ON c.id = q.challenge_id
         INNER JOIN rounds r ON r.id = c.round_id
         WHERE q.token_hash = $1
           AND q.is_active = TRUE
           AND c.is_active = TRUE
           AND r.status = 'ACTIVE'
         FOR UPDATE OF q`,
                [tokenHash]
            );

            if (checkpointResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return reply.code(404).send({
                    message: 'Invalid, inactive or unavailable QR checkpoint.'
                });
            }

            const checkpoint = checkpointResult.rows[0];

            // Record the scan. The database unique constraint
            // prevents duplicate scans by the same team.
            const scanResult = await client.query(
                `INSERT INTO qr_scans (team_id, qr_checkpoint_id)
         VALUES ($1, $2)
         ON CONFLICT (team_id, qr_checkpoint_id) DO NOTHING
         RETURNING id, scanned_at`,
                [team.teamId, checkpoint.id]
            );

            if (scanResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return reply.code(409).send({
                    message: 'Your team has already scanned this checkpoint.'
                });
            }

            await client.query('COMMIT');

            return reply.send({
                message: 'QR checkpoint scanned successfully.',
                checkpoint: {
                    id: checkpoint.id,
                    name: checkpoint.checkpoint_name,
                    challengeTitle: checkpoint.title
                },
                scan: scanResult.rows[0]
            });

        } catch (error) {
            await client.query('ROLLBACK');

            app.log.error(
                { err: error },
                'QR scanning failed'
            );

            return reply.code(500).send({
                message: 'Unable to process QR scan.'
            });

        } finally {
            client.release();
        }
    });

}
