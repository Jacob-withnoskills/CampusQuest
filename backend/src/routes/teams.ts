
import {
  randomInt,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from 'node:crypto';

import { promisify } from 'node:util';
import type { FastifyInstance } from 'fastify';
import { pool } from '../db.js';
import { createTeamToken } from '../auth.js';
const scrypt = promisify(scryptCallback);

async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(pin, salt, 64)) as Buffer;

  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const [salt, originalHash] = storedHash.split(':');

  if (!salt || !originalHash || !/^[a-f0-9]{128}$/i.test(originalHash)) {
    return false;
  }

  const derivedKey = (await scrypt(pin, salt, 64)) as Buffer;
  const expectedHash = Buffer.from(originalHash, 'hex');

  return (
    derivedKey.length === expectedHash.length &&
    timingSafeEqual(derivedKey, expectedHash)
  );
}

function generateTeamCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CQ-';

  for (let i = 0; i < 5; i++) {
    code += alphabet[randomInt(alphabet.length)];
  }

  return code;
}

export async function teamRoutes(app: FastifyInstance) {

  // TEAM REGISTRATION
  app.post<{
    Body: {
      teamName: string;
      members: string[];
    };
  }>('/register', async (request, reply) => {
    const teamName = request.body?.teamName?.trim();
    const members = request.body?.members;

    if (
      !teamName ||
      teamName.length > 40 ||
      !Array.isArray(members) ||
      members.length !== 5 ||
      members.some(
        (member) =>
          typeof member !== 'string' ||
          !member.trim() ||
          member.trim().length > 60
      )
    ) {
      return reply.code(400).send({
        message: 'Provide a team name and exactly five valid member names.'
      });
    }

    const cleanMembers = members.map((member) => member.trim());
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const pin = String(randomInt(100000, 1000000));
      const passwordHash = await hashPin(pin);
      const teamCode = generateTeamCode();

      const teamResult = await client.query(
        `INSERT INTO teams (team_code, team_name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, team_code, team_name`,
        [teamCode, teamName, passwordHash]
      );

      const team = teamResult.rows[0];

      for (const member of cleanMembers) {
        await client.query(
          `INSERT INTO participants (team_id, full_name)
           VALUES ($1, $2)`,
          [team.id, member]
        );
      }

      await client.query('COMMIT');

      return reply.code(201).send({
        message: 'Team registered successfully.',
        team: {
          id: team.id,
          teamCode: team.team_code,
          teamName: team.team_name,
          members: cleanMembers,
          pin
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      app.log.error({ err: error }, 'Team registration failed');

      return reply.code(500).send({
        message: 'Team registration failed. Please try again.'
      });

    } finally {
      client.release();
    }
  });

  // TEAM LOGIN
  app.post<{
    Body: {
      teamCode: string;
      pin: string;
    };
  }>('/login', async (request, reply) => {
    const teamCode = request.body?.teamCode?.trim().toUpperCase();
    const pin = request.body?.pin?.trim();

    if (!teamCode || !/^\d{6}$/.test(pin ?? '')) {
      return reply.code(400).send({
        message: 'Enter a valid Team ID and six-digit PIN.'
      });
    }

    try {
      const result = await pool.query(
        `SELECT id, team_code, team_name, password_hash
         FROM teams
         WHERE team_code = $1 AND is_active = TRUE`,
        [teamCode]
      );

      if (result.rows.length === 0) {
        return reply.code(401).send({
          message: 'Invalid Team ID or PIN.'
        });
      }

      const team = result.rows[0];

      const validPin = await verifyPin(pin, team.password_hash);

      if (!validPin) {
        return reply.code(401).send({
          message: 'Invalid Team ID or PIN.'
        });
      }

      const membersResult = await pool.query(
        `SELECT full_name
         FROM participants
         WHERE team_id = $1
         ORDER BY created_at`,
        [team.id]
      );

      const token = createTeamToken(team.id, team.team_code);

      return reply.send({
        message: 'Login successful.',
        token,
        team: {
          id: team.id,
          teamCode: team.team_code,
          teamName: team.team_name,
          members: membersResult.rows.map((row) => row.full_name)
        }
      });
    } catch (error) {
      app.log.error({ err: error }, 'Team login failed');

      return reply.code(500).send({
        message: 'Login failed. Please try again.'
      });
    }
  });
}
