
import type { FastifyInstance } from 'fastify';
import { pool } from '../db.js';

export async function roundRoutes(app: FastifyInstance) {

    // GET: Retrieve all rounds
    app.get('/', async (_request, reply) => {
        try {
            const result = await pool.query(`
        SELECT
          id,
          round_number AS "roundNumber",
          round_name AS "roundName",
          status,
          qualification_mode AS "qualificationMode",
          qualification_value AS "qualificationValue"
        FROM rounds
        ORDER BY round_number
      `);

            return reply.send({ rounds: result.rows });
        } catch (error) {
            app.log.error({ err: error }, 'Failed to load rounds');

            return reply.code(500).send({
                message: 'Unable to load rounds.'
            });
        }
    });

    // PATCH: Activate a round
    app.patch<{
        Params: { id: string };
    }>('/:id/activate', async (request, reply) => {
        const { id } = request.params;

        if (!/^[1-9]\d*$/.test(id)) {
            return reply.code(400).send({
                message: 'Invalid round ID.'
            });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const result = await client.query(
                `SELECT id, round_number, status
         FROM rounds
         WHERE id = $1
         FOR UPDATE`,
                [id]
            );

            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return reply.code(404).send({
                    message: 'Round not found.'
                });
            }

            const round = result.rows[0];

            if (round.status === 'COMPLETED') {
                await client.query('ROLLBACK');
                return reply.code(409).send({
                    message: 'Completed rounds cannot be activated again.'
                });
            }

            if (round.round_number > 1) {
                const previousRound = await client.query(
                    `SELECT status FROM rounds
           WHERE round_number = $1`,
                    [round.round_number - 1]
                );

                if (
                    previousRound.rowCount === 0 ||
                    previousRound.rows[0].status !== 'COMPLETED'
                ) {
                    await client.query('ROLLBACK');
                    return reply.code(409).send({
                        message: 'Complete the previous round first.'
                    });
                }
            }

            const activeRound = await client.query(
                `SELECT id FROM rounds
         WHERE status = 'ACTIVE'
         AND id <> $1
         FOR UPDATE`,
                [id]
            );

            if (activeRound.rowCount && activeRound.rowCount > 0) {
                await client.query('ROLLBACK');
                return reply.code(409).send({
                    message: 'Another round is already active. Complete it first.'
                });
            }

            const updated = await client.query(
                `UPDATE rounds
         SET status = 'ACTIVE',
             started_at = COALESCE(started_at, NOW())
         WHERE id = $1
         RETURNING id, round_number AS "roundNumber",
                   round_name AS "roundName", status`,
                [id]
            );

            await client.query('COMMIT');

            app.io.emit('rounds:update', {
                roundId: Number(updated.rows[0].id),
                roundNumber: Number(updated.rows[0].roundNumber),
                status: updated.rows[0].status
            });

            return reply.send({
                message: 'Round activated successfully.',
                round: updated.rows[0]
            });

        } catch (error) {
            await client.query('ROLLBACK');
            app.log.error({ err: error }, 'Round activation failed');

            return reply.code(500).send({
                message: 'Unable to activate round.'
            });
        } finally {
            client.release();
        }
    });

    // PATCH: Complete an active round

    // PATCH: Complete an active round and calculate qualification
    app.patch<{
        Params: { id: string };
    }>('/:id/complete', async (request, reply) => {

        const { id } = request.params;

        if (!/^[1-9]\d*$/.test(id)) {
            return reply.code(400).send({
                message: 'Invalid round ID.'
            });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Lock the round to prevent concurrent completion.
            const roundResult = await client.query(
                `SELECT
                    id,
                    round_number,
                    status,
                    qualification_mode,
                    qualification_value
                 FROM rounds
                 WHERE id = $1
                 FOR UPDATE`,
                [id]
            );

            if (roundResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return reply.code(404).send({
                    message: 'Round not found.'
                });
            }

            const round = roundResult.rows[0];

            if (round.status !== 'ACTIVE') {
                await client.query('ROLLBACK');
                return reply.code(409).send({
                    message: 'Only active rounds can be completed.'
                });
            }

            // Calculate rank and score for every active team.
            const rankingResult = await client.query(
                `SELECT
                    t.id AS team_id,
                    COALESCE(ts.total_points, 0) AS total_points,
                    RANK() OVER (
                        ORDER BY COALESCE(ts.total_points, 0) DESC
                    ) AS team_rank
                 FROM teams t
                 LEFT JOIN team_scores ts
                    ON ts.team_id = t.id
                    AND ts.round_id = $1
                 WHERE t.is_active = TRUE
                 ORDER BY total_points DESC`,
                [id]
            );

            const totalTeams = rankingResult.rows.length;

            if (totalTeams === 0) {
                await client.query('ROLLBACK');
                return reply.code(409).send({
                    message: 'No active teams available for qualification.'
                });
            }

            let qualificationCount: number;

            if (round.qualification_mode === 'PERCENTAGE') {
                qualificationCount = Math.ceil(
                    totalTeams *
                    Number(round.qualification_value) / 100
                );
            } else {
                qualificationCount = Math.min(
                    totalTeams,
                    Number(round.qualification_value)
                );
            }

            // Determine cutoff rank.
            const cutoff = rankingResult.rows[
                qualificationCount - 1
            ];

            const cutoffRank = Number(cutoff.team_rank);

            // Include every team tied at the cutoff.
            for (const team of rankingResult.rows) {
                const teamRank = Number(team.team_rank);
                const qualified = teamRank <= cutoffRank;

                await client.query(
                    `INSERT INTO qualifications (
                        team_id,
                        from_round_id,
                        qualified,
                        rank
                    )
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (team_id, from_round_id)
                    DO UPDATE SET
                        qualified = EXCLUDED.qualified,
                        rank = EXCLUDED.rank`,
                    [
                        team.team_id,
                        id,
                        qualified,
                        teamRank
                    ]
                );
            }

            // Complete the round only after qualification succeeds.
            const completed = await client.query(
                `UPDATE rounds
                 SET status = 'COMPLETED',
                     completed_at = NOW()
                 WHERE id = $1
                 RETURNING
                    id,
                    round_number AS "roundNumber",
                    round_name AS "roundName",
                    status`,
                [id]
            );

            await client.query('COMMIT');

            const qualifiedTeams = rankingResult.rows.filter(
                (team) => Number(team.team_rank) <= cutoffRank
            ).length;

            return reply.send({
                message: 'Round completed and qualification calculated successfully.',
                round: completed.rows[0],
                qualification: {
                    mode: round.qualification_mode,
                    value: round.qualification_value,
                    totalTeams,
                    qualificationCount,
                    qualifiedTeams,
                    cutoffRank
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');

            app.log.error(
                { err: error },
                'Round completion and qualification failed'
            );

            return reply.code(500).send({
                message: 'Unable to complete round and calculate qualification.'
            });

        } finally {
            client.release();
        }
    });

    // PATCH: Update qualification criteria
    app.patch<{
        Params: { id: string };
        Body: {
            qualificationMode: 'PERCENTAGE' | 'EXACT';
            qualificationValue: number;
        };
    }>('/:id/qualification', async (request, reply) => {
        const { id } = request.params;
        const { qualificationMode, qualificationValue } = request.body ?? {};

        if (
            !/^[1-9]\d*$/.test(id) ||
            !['PERCENTAGE', 'EXACT'].includes(qualificationMode) ||
            typeof qualificationValue !== 'number' ||
            !Number.isFinite(qualificationValue) ||
            (qualificationMode === 'PERCENTAGE' &&
                (qualificationValue <= 0 || qualificationValue > 100)) ||
            (qualificationMode === 'EXACT' &&
                (!Number.isInteger(qualificationValue) || qualificationValue < 1))
        ) {
            return reply.code(400).send({
                message: 'Invalid qualification criteria.'
            });
        }

        try {
            const result = await pool.query(
                `UPDATE rounds
         SET qualification_mode = $1,
             qualification_value = $2
         WHERE id = $3 AND status <> 'COMPLETED'
         RETURNING id, round_number AS "roundNumber",
                   qualification_mode AS "qualificationMode",
                   qualification_value AS "qualificationValue"`,
                [qualificationMode, qualificationValue, id]
            );

            if (result.rowCount === 0) {
                return reply.code(404).send({
                    message: 'Round not found or already completed.'
                });
            }

            return reply.send({
                message: 'Qualification criteria updated.',
                round: result.rows[0]
            });

        } catch (error) {
            app.log.error({ err: error }, 'Qualification update failed');

            return reply.code(500).send({
                message: 'Unable to update qualification criteria.'
            });
        }
    });
}
