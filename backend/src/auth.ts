
import {
    createHmac,
    randomBytes,
    timingSafeEqual
} from 'node:crypto';

import { config } from './config.js';

interface TeamTokenPayload {
    teamId: string;
    teamCode: string;
    expiresAt: number;
}

const TOKEN_LIFETIME_SECONDS = 60 * 60 * 12;

export function createTeamToken(
    teamId: string,
    teamCode: string
): string {
    const payload: TeamTokenPayload = {
        teamId,
        teamCode,
        expiresAt: Math.floor(Date.now() / 1000) +
            TOKEN_LIFETIME_SECONDS
    };

    const encodedPayload = Buffer
        .from(JSON.stringify(payload))
        .toString('base64url');

    const signature = createHmac('sha256', config.authSecret)
        .update(encodedPayload)
        .digest('base64url');

    return `${encodedPayload}.${signature}`;
}

export function verifyTeamToken(
    token: string
): TeamTokenPayload | null {
    const parts = token.split('.');

    if (parts.length !== 2) return null;

    const [encodedPayload, suppliedSignature] = parts;

    if (!encodedPayload || !suppliedSignature) return null;

    const expectedSignature = createHmac(
        'sha256',
        config.authSecret
    )
        .update(encodedPayload)
        .digest();

    let receivedSignature: Buffer;

    try {
        receivedSignature = Buffer.from(
            suppliedSignature,
            'base64url'
        );
    } catch {
        return null;
    }

    if (
        receivedSignature.length !== expectedSignature.length ||
        !timingSafeEqual(receivedSignature, expectedSignature)
    ) {
        return null;
    }

    try {
        const payload = JSON.parse(
            Buffer.from(encodedPayload, 'base64url').toString('utf8')
        ) as TeamTokenPayload;

        if (
            typeof payload.teamId !== 'string' ||
            typeof payload.teamCode !== 'string' ||
            typeof payload.expiresAt !== 'number' ||
            payload.expiresAt <= Math.floor(Date.now() / 1000)
        ) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}
