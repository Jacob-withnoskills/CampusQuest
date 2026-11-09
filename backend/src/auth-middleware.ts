
import type {
    FastifyReply,
    FastifyRequest
} from 'fastify';

import { verifyTeamToken } from './auth.js';

declare module 'fastify' {
    interface FastifyRequest {
        team: {
            teamId: string;
            teamCode: string;
        } | null;
    }
}

export async function authenticateTeam(
    request: FastifyRequest,
    reply: FastifyReply
) {
    request.team = null;

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
        return reply.code(401).send({
            message: 'Authentication required.'
        });
    }

    const token = authorization.slice(7).trim();

    if (!token || token.length > 2048) {
        return reply.code(401).send({
            message: 'Invalid authentication token.'
        });
    }

    const payload = verifyTeamToken(token);

    if (!payload) {
        return reply.code(401).send({
            message: 'Invalid or expired authentication token.'
        });
    }

    request.team = {
        teamId: payload.teamId,
        teamCode: payload.teamCode
    };
}
