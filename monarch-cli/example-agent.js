#!/usr/bin/env node

/**
 * Example: Autonomous Agent Using Monarch Protocol
 * 
 * This demonstrates how an agent would:
 * 1. Load its dossier
 * 2. Sign data
 * 3. Submit notarizations
 */

import fetch from 'node-fetch';
import { loadDossier, signData } from './dossier.js';

class MonarchAgent {
  constructor(agentName, backendUrl = 'http://localhost:3000') {
    this.agentName = agentName;
    this.backendUrl = backendUrl;
    this.dossier = null;
  }

  // Load agent's dossier
  async initialize() {
    try {
      this.dossier = loadDossier(this.agentName);
      console.log(`✓ Agent ${this.agentName} initialized`);
      return true;
    } catch (err) {
      console.error(`✗ Failed to load dossier: ${err.message}`);
      return false;
    }
  }

  // Notarize intel data
  async notarizeIntel(intelData, metadata = {}) {
    if (!this.dossier) {
      console.error('Agent not initialized');
      return null;
    }

    try {
      // Sign the data with agent's secret key
      const signature = signData(this.agentName, intelData);

      // Submit to Monarch backend
      const response = await fetch(`${this.backendUrl}/api/notarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: this.agentName,
          publicKey: this.dossier.cryptography.publicKey,
          data: intelData,
          signature: signature,
          metadata: metadata,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Backend returned error');
      }

      const result = await response.json();
      console.log(`✓ Intel notarized: ${result.notary.id}`);
      return result.notary;
    } catch (err) {
      console.error(`✗ Notarization failed: ${err.message}`);
      return null;
    }
  }

  // Get agent status from backend
  async getStatus() {
    try {
      const response = await fetch(
        `${this.backendUrl}/api/status/${this.agentName}`
      );

      if (!response.ok) {
        throw new Error('Status check failed');
      }

      return await response.json();
    } catch (err) {
      console.error(`✗ Status check failed: ${err.message}`);
      return null;
    }
  }

  // Verify a specific notarization
  async verifyNotarization(notaryId) {
    try {
      const response = await fetch(`${this.backendUrl}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: this.dossier.cryptography.publicKey,
          notaryId: notaryId,
        }),
      });

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      return await response.json();
    } catch (err) {
      console.error(`✗ Verification failed: ${err.message}`);
      return null;
    }
  }
}

// ============ EXAMPLE USAGE ============

async function runExample() {
  console.log('🦋 Monarch Agent Example\n');

  // Initialize agent
  const agent = new MonarchAgent('@example_agent');
  const initialized = await agent.initialize();

  if (!initialized) {
    console.log('\nNote: Install agent first:');
    console.log('  node index.js install @example_agent');
    process.exit(1);
  }

  // Simulate agent operations
  console.log('\n--- Agent Operations ---\n');

  // 1. Check status
  console.log('Checking agent status...');
  const status = await agent.getStatus();
  if (status) {
    console.log(`  Status: ${status.agent.status}`);
    console.log(`  Notarizations: ${status.agent.notarizations}`);
  }

  // 2. Notarize some intel
  console.log('\nNotarizing intel...');
  const intel1 = {
    timestamp: new Date().toISOString(),
    type: 'observation',
    source: 'sensor_01',
    data: { temperature: 72.5, humidity: 45 },
  };

  const notary1 = await agent.notarizeIntel(intel1, {
    location: 'zone_a',
    priority: 'normal',
  });

  // 3. Notarize more intel
  console.log('\nNotarizing more intel...');
  const intel2 = {
    timestamp: new Date().toISOString(),
    type: 'action',
    agent: '@example_agent',
    action: 'executed_task_42',
    result: 'success',
  };

  const notary2 = await agent.notarizeIntel(intel2);

  // 4. Verify notarizations
  if (notary1) {
    console.log(`\nVerifying notarization ${notary1.id}...`);
    const verification = await agent.verifyNotarization(notary1.id);
    if (verification && verification.verified) {
      console.log(`  ✓ Notarization verified`);
    }
  }

  // 5. Final status
  console.log('\nFinal status:');
  const finalStatus = await agent.getStatus();
  if (finalStatus) {
    console.log(`  Total notarizations: ${finalStatus.agent.notarizations}`);
  }

  console.log('\n✓ Example complete\n');
}

// Run if executed directly
runExample().catch(console.error);

// Export for use as module
export { MonarchAgent };
