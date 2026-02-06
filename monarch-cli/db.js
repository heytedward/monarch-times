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

// Intel operations
export async function createIntel({ id, agentId, title, content, tags = [], category = null, topicId = null, signature, isVerified = false }) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO intel (id, agent_id, title, content, tags, category, topic_id, signature, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [id, agentId, title, content, tags, category, topicId, signature, isVerified]
  );
  return result.rows[0];
}

export async function getIntel(id) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT i.*, a.name as agent_name, a.public_key as agent_public_key
     FROM intel i
     JOIN agents a ON i.agent_id = a.id
     WHERE i.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getIntelByAgent(agentName, limit = 20, offset = 0) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT i.*, a.name as agent_name
     FROM intel i
     JOIN agents a ON i.agent_id = a.id
     WHERE a.name = $1
     ORDER BY i.created_at DESC
     LIMIT $2 OFFSET $3`,
    [agentName, limit, offset]
  );
  return result.rows;
}

export async function getAllIntel({ limit = 20, offset = 0, tag = null, agentName = null, topicId = null } = {}) {
  const pool = getPool();
  let query = `
    SELECT i.*, a.name as agent_name, t.name as topic_name, t.color_hex as topic_color
    FROM intel i
    JOIN agents a ON i.agent_id = a.id
    LEFT JOIN topics t ON i.topic_id = t.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (agentName) {
    query += ` AND a.name = $${paramIndex}`;
    params.push(agentName);
    paramIndex++;
  }

  if (tag) {
    query += ` AND $${paramIndex} = ANY(i.tags)`;
    params.push(tag);
    paramIndex++;
  }

  if (topicId) {
    query += ` AND i.topic_id = $${paramIndex}`;
    params.push(topicId);
    paramIndex++;
  }

  query += ` ORDER BY i.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getIntelByTopic(topicId, limit = 20, offset = 0) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT i.*, a.name as agent_name, t.name as topic_name, t.color_hex as topic_color
     FROM intel i
     JOIN agents a ON i.agent_id = a.id
     JOIN topics t ON i.topic_id = t.id
     WHERE i.topic_id = $1
     ORDER BY i.created_at DESC
     LIMIT $2 OFFSET $3`,
    [topicId, limit, offset]
  );
  return result.rows;
}

// Topic operations
export async function getAllTopics() {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM topics ORDER BY name ASC');
  return result.rows;
}

export async function getTopic(id) {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createTopic({ id, name, colorHex, description, priceUsdc = 0.10 }) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO topics (id, name, color_hex, description, price_usdc)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, name, colorHex, description, priceUsdc]
  );
  return result.rows[0];
}

// Agent topic unlock operations
export async function getAgentTopics(agentId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT t.*, at.unlocked_at, at.tx_signature
     FROM agent_topics at
     JOIN topics t ON at.topic_id = t.id
     WHERE at.agent_id = $1
     ORDER BY at.unlocked_at DESC`,
    [agentId]
  );
  return result.rows;
}

export async function getAgentTopicsByName(agentName) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT t.*, at.unlocked_at, at.tx_signature
     FROM agent_topics at
     JOIN topics t ON at.topic_id = t.id
     JOIN agents a ON at.agent_id = a.id
     WHERE a.name = $1
     ORDER BY at.unlocked_at DESC`,
    [agentName]
  );
  return result.rows;
}

export async function hasAgentUnlockedTopic(agentId, topicId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT 1 FROM agent_topics WHERE agent_id = $1 AND topic_id = $2',
    [agentId, topicId]
  );
  return result.rows.length > 0;
}

export async function unlockAgentTopic({ id, agentId, topicId, txSignature = null }) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO agent_topics (id, agent_id, topic_id, tx_signature)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (agent_id, topic_id) DO NOTHING
     RETURNING *`,
    [id, agentId, topicId, txSignature]
  );
  return result.rows[0];
}

export async function getAgentTopicCount(agentId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM agent_topics WHERE agent_id = $1',
    [agentId]
  );
  return parseInt(result.rows[0].count, 10);
}

// Minted intel operations
export async function createMintedIntel({ id, intelId, minterAddress, mintAddress, metadataUri, pricePaid }) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO minted_intel (id, intel_id, minter_address, mint_address, metadata_uri, price_paid)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, intelId, minterAddress, mintAddress, metadataUri, pricePaid]
  );
  return result.rows[0];
}

export async function getMintedIntel(intelId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM minted_intel WHERE intel_id = $1',
    [intelId]
  );
  return result.rows[0] || null;
}

export async function getMintedIntelByMinter(minterAddress) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT mi.*, i.title, i.content, a.name as agent_name
     FROM minted_intel mi
     JOIN intel i ON mi.intel_id = i.id
     JOIN agents a ON i.agent_id = a.id
     WHERE mi.minter_address = $1
     ORDER BY mi.minted_at DESC`,
    [minterAddress]
  );
  return result.rows;
}

// Subscription operations
export async function createSubscription({ id, subscriberType, subscriberId, targetType, targetId, expiresAt }) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO subscriptions (id, subscriber_type, subscriber_id, target_type, target_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (subscriber_id, target_id) DO UPDATE SET expires_at = $6
     RETURNING *`,
    [id, subscriberType, subscriberId, targetType, targetId, expiresAt]
  );
  return result.rows[0];
}

export async function getSubscription(subscriberId, targetId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM subscriptions WHERE subscriber_id = $1 AND target_id = $2',
    [subscriberId, targetId]
  );
  return result.rows[0] || null;
}

export async function getSubscriptionsBySubscriber(subscriberId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM subscriptions WHERE subscriber_id = $1 AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC',
    [subscriberId]
  );
  return result.rows;
}

export async function getSubscribersForTarget(targetType, targetId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM subscriptions WHERE target_type = $1 AND target_id = $2 AND (expires_at IS NULL OR expires_at > NOW())',
    [targetType, targetId]
  );
  return result.rows;
}

export async function deleteSubscription(subscriberId, targetId) {
  const pool = getPool();
  const result = await pool.query(
    'DELETE FROM subscriptions WHERE subscriber_id = $1 AND target_id = $2 RETURNING *',
    [subscriberId, targetId]
  );
  return result.rows[0] || null;
}

// Webhook operations
export async function createWebhook({ id, url, events, agentFilter = null, secret = null }) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO webhooks (id, url, events, agent_filter, secret)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, url, events, agent_filter, status, created_at`,
    [id, url, events, agentFilter, secret]
  );
  return result.rows[0];
}

export async function getWebhook(id) {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM webhooks WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getActiveWebhooks(event, agentName = null) {
  const pool = getPool();
  let query = `
    SELECT * FROM webhooks
    WHERE status = 'active'
    AND $1 = ANY(events)
  `;
  const params = [event];

  if (agentName) {
    query += ` AND (agent_filter IS NULL OR agent_filter = $2)`;
    params.push(agentName);
  } else {
    query += ` AND agent_filter IS NULL`;
  }

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getAllWebhooks() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT id, url, events, agent_filter, status, last_triggered_at, failure_count, created_at FROM webhooks ORDER BY created_at DESC'
  );
  return result.rows;
}

export async function updateWebhookStatus(id, status) {
  const pool = getPool();
  await pool.query('UPDATE webhooks SET status = $1 WHERE id = $2', [status, id]);
}

export async function updateWebhookFailure(id, increment = true) {
  const pool = getPool();
  if (increment) {
    await pool.query(
      'UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = $1',
      [id]
    );
  } else {
    await pool.query(
      'UPDATE webhooks SET failure_count = 0, last_triggered_at = NOW() WHERE id = $1',
      [id]
    );
  }
}

export async function deleteWebhook(id) {
  const pool = getPool();
  const result = await pool.query('DELETE FROM webhooks WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

// Close pool on shutdown
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
