
import {
    createHash,
    timingSafeEqual
} from 'node:crypto';

import type { FastifyInstance } from 'fastify';
import { pool } from '../db.js';
import { authenticateTeam } from '../auth-middleware.js';

function hashAnswer(answer: string): Buffer {
    return createHash('sha256')
        .update(answer.trim().toLowerCase())
        .digest();
}

export async function submissionRoutes(app: FastifyInstance) {

    app.post<{
        Body: {
            challengeId: number;
            answer: string;
            idempotencyKey: string;
        };
    }>('/', {
        preHandler: authenticateTeam
    }, async (request, reply) => {

        const { challengeId, answer, idempotencyKey } =
            request.body ?? {};

        if (
            !request.team ||
            !Number.isSafeInteger(challengeId) ||
            challengeId <= 0 ||
            typeof answer !== 'string' ||
            !answer.trim() ||
            answer.length > 500 ||
            typeof idempotencyKey !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)
        ) {
            return reply.code(400).send({
                message: 'Provide valid submission details.'
            });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Lock challenge and round while validating submission.
            const challengeResult = await client.query(
                `SELECT
                    c.id,
                    c.round_id,
                    c.answer_hash,
                    c.points,
                    c.is_active,
                    r.status AS round_status
                 FROM challenges c
                 JOIN rounds r ON r.id = c.round_id
                 WHERE c.id = $1
                 FOR UPDATE OF c, r`,
                [challengeId]
            );

            if (challengeResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return reply.code(404).send({
                    message: 'Challenge not found.'
                });
            }

            const challenge = challengeResult.rows[0];

            if (
                !challenge.is_active ||
                challenge.round_status !== 'ACTIVE'
            ) {
                await client.query('ROLLBACK');
                return reply.code(409).send({
                    message: 'This challenge or round is not active.'
                });
            }

            // Verify that the team still exists and is active.
            const teamResult = await client.query(
                `SELECT id
                 FROM teams
                 WHERE id = $1 AND is_active = TRUE
                 FOR UPDATE`,
                [request.team.teamId]
            );

            if (teamResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return reply.code(403).send({
                    message: 'Team is inactive or unavailable.'
                });
            }

            const submittedHash = hashAnswer(answer);
            const storedHash = Buffer.from(
                challenge.answer_hash,
                'hex'
            );

            const isCorrect =
                storedHash.length === submittedHash.length &&
                timingSafeEqual(storedHash, submittedHash);

            const pointsAwarded =
                isCorrect ? challenge.points : 0;

            // Unique constraints prevent duplicate requests
            // and repeated attempts for the same challenge.
            const submissionResult = await client.query(
                `INSERT INTO submissions (
                    idempotency_key,
                    team_id,
                    challenge_id,
                    answer,
                    is_correct,
                    points_awarded
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
                RETURNING id`,
                [
                    idempotencyKey,
                    request.team.teamId,
                    challengeId,
                    answer.trim(),
                    isCorrect,
                    pointsAwarded
                ]
            );

            if (submissionResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return reply.code(409).send({
                    message: 'This submission has already been recorded.'
                });
            }

            // Maintain the team's cumulative score for this round.
            const scoreResult = await client.query(
                `INSERT INTO team_scores (
                    team_id,
                    round_id,
                    total_points,
                    updated_at
                )
                SELECT
                    $1,
                    $2,
                    COALESCE(SUM(points_awarded), 0),
                    NOW()
                FROM submissions
                WHERE team_id = $1
                  AND challenge_id IN (
                      SELECT id
                      FROM challenges
                      WHERE round_id = $2
                  )
                ON CONFLICT (team_id, round_id)
                DO UPDATE SET
                    total_points = EXCLUDED.total_points,
                    updated_at = NOW()
                RETURNING total_points`,
                [
                    request.team.teamId,
                    challenge.round_id
                ]
            );

            await client.query('COMMIT');

            // Notify all connected clients about the updated leaderboard.
            app.io.emit('leaderboard:update', {
                roundId: Number(challenge.round_id),
                teamId: request.team.teamId,
                totalPoints: Number(scoreResult.rows[0].total_points)
            });

            return reply.code(201).send({
                message: 'Answer submitted successfully.',
                correct: isCorrect,
                pointsAwarded,
                totalPoints: scoreResult.rows[0].total_points
            });

        } catch (error) {
            await client.query('ROLLBACK');
            app.log.error(
                { err: error },
                'Answer submission failed'
            );

            return reply.code(500).send({
                message: 'Unable to process answer submission.'
            });

        } finally {
            client.release();
        }
    });
}
