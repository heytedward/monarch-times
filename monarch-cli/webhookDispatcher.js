import crypto from 'crypto';
import * as db from './db.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const notaryDir = path.join(os.homedir(), '.monarch', 'notary');
const USE_DATABASE = !!process.env.DATABASE_URL;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload, secret) {
  if (!secret) return null;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

/**
 * Get webhooks that match the event
 */
async function getMatchingWebhooks(event, agentName = null) {
  if (USE_DATABASE) {
    return await db.getActiveWebhooks(event, agentName);
  }

  // Fallback file storage
  const files = fs.readdirSync(notaryDir).filter(f => f.startsWith('webhook-'));
  return files
    .map(f => JSON.parse(fs.readFileSync(path.join(notaryDir, f), 'utf-8')))
    .filter(w => {
      if (w.status !== 'active') return false;
      if (!w.events.includes(event)) return false;
      if (agentName && w.agentFilter && w.agentFilter !== agentName) return false;
      return true;
    });
}

/**
 * Update webhook failure count
 */
async function updateWebhookFailure(webhookId, reset = false) {
  if (USE_DATABASE) {
    await db.updateWebhookFailure(webhookId, !reset);
    return;
  }

  // Fallback file storage
  const webhookFile = path.join(notaryDir, `webhook-${webhookId}.json`);
  if (fs.existsSync(webhookFile)) {
    const webhook = JSON.parse(fs.readFileSync(webhookFile, 'utf-8'));
    if (reset) {
      webhook.failureCount = 0;
      webhook.lastTriggeredAt = new Date().toISOString();
    } else {
      webhook.failureCount = (webhook.failureCount || 0) + 1;
      if (webhook.failureCount >= 10) {
        webhook.status = 'disabled';
      }
    }
    fs.writeFileSync(webhookFile, JSON.stringify(webhook, null, 2));
  }
}

/**
 * Deliver webhook with retries
 */
async function deliverWebhook(webhook, payload, attempt = 0) {
  const signature = generateSignature(payload, webhook.secret);

  const headers = {
    'Content-Type': 'application/json',
    'X-Monarch-Event': payload.event,
    'X-Monarch-Delivery': `${webhook.id}-${Date.now()}`,
  };

  if (signature) {
    headers['X-Monarch-Signature'] = `sha256=${signature}`;
  }

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (response.ok) {
      await updateWebhookFailure(webhook.id, true);
      console.log(`[Webhook] Delivered to ${webhook.url}`);
      return true;
    }

    throw new Error(`HTTP ${response.status}`);
  } catch (err) {
    console.error(`[Webhook] Delivery failed to ${webhook.url}: ${err.message}`);

    if (attempt < MAX_RETRIES - 1) {
      const delay = RETRY_DELAYS[attempt];
      console.log(`[Webhook] Retrying in ${delay}ms (attempt ${attempt + 2}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return deliverWebhook(webhook, payload, attempt + 1);
    }

    await updateWebhookFailure(webhook.id);
    return false;
  }
}

/**
 * Dispatch webhooks for an event
 */
export async function dispatchWebhooks(event, data) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const agentName = data.agent || null;
  const webhooks = await getMatchingWebhooks(event, agentName);

  if (webhooks.length === 0) {
    return;
  }

  console.log(`[Webhook] Dispatching ${event} to ${webhooks.length} subscriber(s)`);

  // Dispatch in parallel (fire and forget)
  webhooks.forEach(webhook => {
    deliverWebhook(webhook, payload).catch(err => {
      console.error(`[Webhook] Unhandled error: ${err.message}`);
    });
  });
}

/**
 * Initialize webhook dispatcher with event bus
 */
export function initWebhookDispatcher(eventBus) {
  eventBus.on('intel.created', (data) => {
    dispatchWebhooks('intel.created', data);
  });

  eventBus.on('agent.registered', (data) => {
    dispatchWebhooks('agent.registered', data);
  });

  console.log('[Webhook] Dispatcher initialized');
}
