import { Pool } from 'pg';

const pgConfig = {
  user: process.env.POSTGRES_USER || 'catome_admin',
  password: process.env.POSTGRES_PASSWORD || 'catome_secure_pass_3939',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'catomes_neural_core',
};

let pool: Pool | null = null;

export function getPgPool() {
  if (!pool) {
    pool = new Pool(pgConfig);
  }
  return pool;
}

export async function initPgSchema() {
  const client = await getPgPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        tags TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS missions (
        id SERIAL PRIMARY KEY,
        mission_id TEXT UNIQUE NOT NULL,
        title TEXT,
        description TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_id TEXT UNIQUE NOT NULL,
        path TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[Postgres] Neural Schema Initialized');
  } catch (err) {
    console.error('[Postgres] Failed to initialize schema:', err);
  } finally {
    client.release();
  }
}

export const pgService = {
  saveKnowledge: async (key: string, value: string, tags: string = '') => {
    const query = `
      INSERT INTO knowledge_base (key, value, tags, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        tags = EXCLUDED.tags,
        updated_at = CURRENT_TIMESTAMP
    `;
    await getPgPool().query(query, [key, value, tags]);
  },

  searchKnowledge: async (searchTerm: string) => {
    const query = `
      SELECT * FROM knowledge_base 
      WHERE key ILIKE $1 OR value ILIKE $1 OR tags ILIKE $1 
      ORDER BY updated_at DESC
    `;
    const res = await getPgPool().query(query, [`%${searchTerm}%`]);
    return res.rows;
  },

  createMission: async (mission_id: string, title: string, description: string) => {
    const query = `
      INSERT INTO missions (mission_id, title, description, status)
      VALUES ($1, $2, $3, 'active')
    `;
    await getPgPool().query(query, [mission_id, title, description]);
  }
};
