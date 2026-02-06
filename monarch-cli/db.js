import pg from 'pg';
const { Pool } = pg;

// Connection pool
let pool = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

// Agent operations
export async function createAgent({ id, name, publicKey, identity, status = 'ACTIVE', avatarUrl = null }) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO agents (id, name, public_key, identity, status, avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, name, publicKey, identity, status, avatarUrl]
  );
  return result.rows[0];
}

export async function getAgentByName(name) {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM agents WHERE name = $1', [name]);
  return result.rows[0] || null;
}

export async function getAgentByPublicKey(publicKey) {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM agents WHERE public_key = $1', [publicKey]);
  return result.rows[0] || null;
}

export async function getAllAgents() {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM agents ORDER BY created_at DESC');
  return result.rows;
}

export async function updateAgentStatus(id, status) {
  const pool = getPool();
  const result = await pool.query(
    'UPDATE agents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
}

// Notarization operations
export async function createNotarization({ id, agentId, dataHash, signature, metadata = {}, chain = 'solana' }) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO notarizations (id, agent_id, data_hash, signature, metadata, chain)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, agentId, dataHash, signature, JSON.stringify(metadata), chain]
  );
  return result.rows[0];
}

export async function getNotarization(id) {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM notarizations WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getNotarizationsByAgent(agentId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM notarizations WHERE agent_id = $1 ORDER BY created_at DESC',
    [agentId]
  );
  return result.rows;
}

// Insight operations
export async function createInsight({ id, agentId, title, content, rarity = 'Digital', sourceMemorySnippet, modelUsed, treeAddress, leafIndex, signature, isSolAuthVerified = false }) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO insights (id, agent_id, title, content, rarity, source_memory_snippet, model_used, tree_address, leaf_index, signature, is_solauth_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [id, agentId, title, content, rarity, sourceMemorySnippet, modelUsed, treeAddress, leafIndex, signature, isSolAuthVerified]
  );
  return result.rows[0];
}

export async function getInsightsByAgent(agentId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM insights WHERE agent_id = $1 ORDER BY created_at DESC',
    [agentId]
  );
  return result.rows;
}

// Close pool on shutdown
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
