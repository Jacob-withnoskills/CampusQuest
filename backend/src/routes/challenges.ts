
import {
    createHash,
    randomBytes,
    timingSafeEqual
} from 'node:crypto';

import type { FastifyInstance } from 'fastify';
import { pool } from '../db.js';

function hashAnswer(answer: string): string {
    return createHash('sha256')
        .update(answer.trim().toLowerCase())
        .digest('hex');
}

export async function challengeRoutes(app: FastifyInstance) {

    
    app.get<{
        Querystring: { roundId?: string };
    }>('/', async (request, reply) => {
        const roundId = request.query.roundId;

        if (!roundId || !/^[1-9]\d*$/.test(roundId)) {
            return reply.code(400).send({
                message: 'A valid roundId is required.'
            });
        }

        try {
            const result = await pool.query(
                `SELECT
          id,
          round_id AS "roundId",
          title,
          clue,
          hint,
          question,
          points,
          is_active AS "isActive"
         FROM challenges
         WHERE round_id = $1
         ORDER BY id`,
                [roundId]
            );

            return reply.send({ challenges: result.rows });

        } catch (error) {
            app.log.error({ err: error }, 'Failed to retrieve challenges');

            return reply.code(500).send({
                message: 'Unable to retrieve challenges.'
            });
        }
    });

    // POST: Create a challenge
    app.post<{
        Body: {
            roundId: number;
            title: string;
            clue?: string;
            hint?: string;
            question: string;
            answer: string;
            points: number;
        };
    }>('/', async (request, reply) => {

        const {
            roundId,
            title,
            clue,
            hint,
            question,
            answer,
            points
        } = request.body ?? {};

        if (
            !Number.isSafeInteger(roundId) ||
            roundId <= 0 ||
            typeof title !== 'string' ||
            !title.trim() ||
            title.trim().length > 150 ||
            typeof question !== 'string' ||
            !question.trim() ||
            typeof answer !== 'string' ||
            !answer.trim() ||
            answer.length > 500 ||
            !Number.isInteger(points) ||
            points < 1 ||
            points > 10000 ||
            (clue !== undefined && typeof clue !== 'string') ||
            (hint !== undefined && typeof hint !== 'string')
        ) {
            return reply.code(400).send({
                message: 'Provide valid challenge details.'
            });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const round = await client.query(
                'SELECT id FROM rounds WHERE id = $1 FOR SHARE',
                [roundId]
            );

            if (round.rowCount === 0) {
                await client.query('ROLLBACK');

                return reply.code(404).send({
                    message: 'Round not found.'
                });
            }

            const answerHash = hashAnswer(answer);

            const result = await client.query(
                `INSERT INTO challenges
          (round_id, title, clue, hint, question, answer_hash, points, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
         RETURNING id, round_id AS "roundId", title,
                   clue, hint, question, points, is_active AS "isActive"`,
                [
                    roundId,
                    title.trim(),
                    clue?.trim() || null,
                    hint?.trim() || null,
                    question.trim(),
                    answerHash,
                    points
                ]
            );

            await client.query('COMMIT');

            return reply.code(201).send({
                message: 'Challenge created successfully.',
                challenge: result.rows[0]
            });

        } catch (error) {
            await client.query('ROLLBACK');
            app.log.error({ err: error }, 'Challenge creation failed');

            return reply.code(500).send({
                message: 'Unable to create challenge.'
            });

        } finally {
            client.release();
        }
    });


    // PUT: Update challenge details
    app.put<{
        Params: { id: string };
        Body: {
            title: string;
            clue?: string;
            hint?: string;
            question: string;
            answer?: string;
            points: number;
        };
    }>('/:id', async (request, reply) => {
        const { id } = request.params;
        const { title, clue, hint, question, answer, points } = request.body ?? {};

        if (
            !/^[1-9]\d*$/.test(id) ||
            typeof title !== 'string' || !title.trim() ||
            title.trim().length > 150 ||
            typeof question !== 'string' || !question.trim() ||
            !Number.isInteger(points) || points < 1 || points > 10000 ||
            (answer !== undefined &&
                (typeof answer !== 'string' || !answer.trim() || answer.length > 500)) ||
            (clue !== undefined && typeof clue !== 'string') ||
            (hint !== undefined && typeof hint !== 'string')
        ) {
            return reply.code(400).send({
                message: 'Invalid challenge details.'
            });
        }

        try {
            const result = await pool.query(
                `UPDATE challenges
         SET title = $1,
             clue = $2,
             hint = $3,
             question = $4,
             points = $5,
             answer_hash = COALESCE($6, answer_hash)
         WHERE id = $7
         RETURNING id, round_id AS "roundId", title,
                   clue, hint, question, points,
                   is_active AS "isActive"`,
                [
                    title.trim(),
                    clue?.trim() || null,
                    hint?.trim() || null,
                    question.trim(),
                    points,
                    answer === undefined ? null : hashAnswer(answer),
                    id
                ]
            );

            if (result.rowCount === 0) {
                return reply.code(404).send({
                    message: 'Challenge not found.'
                });
            }

            return reply.send({
                message: 'Challenge updated successfully.',
                challenge: result.rows[0]
            });
        } catch (error) {
            app.log.error({ err: error }, 'Challenge update failed');
            return reply.code(500).send({
                message: 'Unable to update challenge.'
            });
        }
    });

    // PATCH: Activate or deactivate a challenge
    app.patch<{
        Params: { id: string };
        Body: { isActive: boolean };
    }>('/:id/status', async (request, reply) => {
        const { id } = request.params;
        const { isActive } = request.body ?? {};

        if (!/^[1-9]\d*$/.test(id) || typeof isActive !== 'boolean') {
            return reply.code(400).send({
                message: 'Provide a valid challenge ID and status.'
            });
        }

        try {
            const result = await pool.query(
                `UPDATE challenges
         SET is_active = $1
         WHERE id = $2
         RETURNING id, title, is_active AS "isActive"`,
                [isActive, id]
            );

            if (result.rowCount === 0) {
                return reply.code(404).send({
                    message: 'Challenge not found.'
                });
            }

            return reply.send({
                message: 'Challenge status updated.',
                challenge: result.rows[0]
            });
        } catch (error) {
            app.log.error({ err: error }, 'Challenge status update failed');
            return reply.code(500).send({
                message: 'Unable to update challenge status.'
            });
        }
    });

    // DELETE: Delete a challenge only if it has no submissions
    app.delete<{
        Params: { id: string };
    }>('/:id', async (request, reply) => {
        const { id } = request.params;

        if (!/^[1-9]\d*$/.test(id)) {
            return reply.code(400).send({
                message: 'Invalid challenge ID.'
            });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const existing = await client.query(
                'SELECT id FROM challenges WHERE id = $1 FOR UPDATE',
                [id]
            );

            if (existing.rowCount === 0) {
                await client.query('ROLLBACK');
                return reply.code(404).send({
                    message: 'Challenge not found.'
                });
            }

            const submissions = await client.query(
                'SELECT 1 FROM submissions WHERE challenge_id = $1 LIMIT 1',
                [id]
            );

            if (submissions.rowCount && submissions.rowCount > 0) {
                await client.query('ROLLBACK');
                return reply.code(409).send({
                    message: 'Challenge has submissions and cannot be deleted.'
                });
            }

            await client.query(
                'DELETE FROM challenges WHERE id = $1',
                [id]
            );

            await client.query('COMMIT');

            return reply.send({
                message: 'Challenge deleted successfully.'
            });
        } catch (error) {
            await client.query('ROLLBACK');
            app.log.error({ err: error }, 'Challenge deletion failed');
            return reply.code(500).send({
                message: 'Unable to delete challenge.'
            });
        } finally {
            client.release();
        }
    });

}
