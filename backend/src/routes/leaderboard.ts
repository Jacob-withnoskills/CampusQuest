
import type { FastifyInstance } from 'fastify';
import { pool } from '../db.js';

export async function leaderboardRoutes(app: FastifyInstance) {

    // GET: Round-wise team leaderboard
    app.get<{
        Querystring: { roundId?: string };
    }>('/', async (request, reply) => {

        const { roundId } = request.query;

        if (!roundId || !/^[1-9]\d*$/.test(roundId)) {
            return reply.code(400).send({
                message: 'A valid roundId is required.'
            });
        }

        try {
            const result = await pool.query(
                `SELECT
                    t.id AS "teamId",
                    t.team_code AS "teamCode",
                    t.team_name AS "teamName",
                    COALESCE(ts.total_points, 0) AS "totalPoints",
                    RANK() OVER (
                        ORDER BY COALESCE(ts.total_points, 0) DESC
                    ) AS rank
                 FROM teams t
                 LEFT JOIN team_scores ts
                    ON ts.team_id = t.id
                    AND ts.round_id = $1
                 WHERE t.is_active = TRUE
                 ORDER BY
                    COALESCE(ts.total_points, 0) DESC,
                    t.team_name ASC`,
                [roundId]
            );

            return reply.send({
                roundId: Number(roundId),
                leaderboard: result.rows
            });

        } catch (error) {
            app.log.error(
                { err: error },
                'Failed to retrieve leaderboard'
            );

            return reply.code(500).send({
                message: 'Unable to retrieve leaderboard.'
            });
        }
    });
}
