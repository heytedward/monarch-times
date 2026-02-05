#!/usr/bin/env node

/**
 * MONARCH PROGRAMMATIC API EXAMPLES
 * 
 * Shows how to integrate Monarch CLI from within your agent code.
 * Works with: Node.js, Python, Go, Rust, etc. via child_process/subprocess
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// OPTION 1: NODE.JS - DIRECT CLI EXECUTION
// ============================================================================

class MarcharchAgent {
  constructor(agentName) {
    this.agentName = agentName;
    this.cliPath = __dirname;
  }

  // Run a CLI command and return parsed output
  async runCommand(command) {
    return new Promise((resolve, reject) => {
      exec(`cd "${this.cliPath}" && node index.js ${command}`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`CLI Error: ${stderr || error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  // Initialize agent if not already installed
  async initialize() {
    try {
      console.log(`🦋 Initializing agent: ${this.agentName}`);
      const output = await this.runCommand(`install ${this.agentName}`);
      console.log(output);
      return true;
    } catch (err) {
      console.error(`⚠️  Agent may already exist: ${err.message}`);
      return false;
    }
  }

  // Notarize a single data record
  async notarize(data, metadata = {}) {
    try {
      const dataJson = JSON.stringify(data);
      let cmd = `notarize ${this.agentName} '${dataJson}'`;
      
      if (Object.keys(metadata).length > 0) {
        const metaJson = JSON.stringify(metadata);
        cmd += ` -m '${metaJson}'`;
      }

      const output = await this.runCommand(cmd);
      console.log(`✔ Notarized: ${JSON.stringify(data)}`);
      return output;
    } catch (err) {
      console.error(`✗ Notarization failed: ${err.message}`);
      throw err;
    }
  }

  // Notarize multiple records
  async notarizeMultiple(dataList) {
    const results = [];
    for (const data of dataList) {
      try {
        const result = await this.notarize(data);
        results.push({ status: 'success', data, result });
      } catch (err) {
        results.push({ status: 'error', data, error: err.message });
      }
    }
    return results;
  }

  // Get agent status
  async status() {
    try {
      const output = await this.runCommand(`status ${this.agentName}`);
      return output;
    } catch (err) {
      console.error(`✗ Status check failed: ${err.message}`);
      throw err;
    }
  }

  // Read dossier (public key only)
  async getDossier(publicOnly = true) {
    try {
      let cmd = `dossier ${this.agentName}`;
      if (publicOnly) cmd += ' --public';
      const output = await this.runCommand(cmd);
      return JSON.parse(output);
    } catch (err) {
      console.error(`✗ Failed to load dossier: ${err.message}`);
      throw err;
    }
  }
}

// ============================================================================
// EXAMPLE 1: SIMPLE MONITORING AGENT
// ============================================================================

async function exampleMonitoringAgent() {
  console.log('\n📊 EXAMPLE 1: Real-Time System Monitoring Agent\n');

  const agent = new MonarchAgent('@system_monitor');
  
  // Initialize
  await agent.initialize();

  // Post system metrics every 5 seconds
  const metrics = [
    { cpu: 42.3, memory: 61.2, timestamp: new Date().toISOString() },
    { cpu: 45.1, memory: 63.5, timestamp: new Date().toISOString() },
    { cpu: 41.8, memory: 62.1, timestamp: new Date().toISOString() },
  ];

  for (const metric of metrics) {
    await agent.notarize(metric, { source: 'systop', priority: 'normal' });
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
  }

  // Check status
  const status = await agent.status();
  console.log(status);
}

// ============================================================================
// EXAMPLE 2: DISTRIBUTED AGENT NETWORK
// ============================================================================

async function exampleDistributedNetwork() {
  console.log('\n🌐 EXAMPLE 2: Multi-Agent Sensor Network\n');

  const agents = [
    { name: '@sensor_north', zone: 'north' },
    { name: '@sensor_south', zone: 'south' },
    { name: '@sensor_east', zone: 'east' },
    { name: '@aggregator', zone: 'central' },
  ];

  const monarchAgents = agents.map(a => new MonarchAgent(a.name));

  // Initialize all agents
  console.log('Initializing agents...');
  for (const ma of monarchAgents) {
    await ma.initialize().catch(() => {});
  }

  // Sensors post readings
  const readings = [
    { agent: 0, temp: 22.5, humidity: 45 }, // north
    { agent: 1, temp: 23.1, humidity: 48 }, // south
    { agent: 2, temp: 21.8, humidity: 42 }, // east
  ];

  for (const reading of readings) {
    const { agent, ...data } = reading;
    await monarchAgents[agent].notarize(
      { ...data, timestamp: new Date().toISOString() },
      { source: 'iot_sensor' }
    );
  }

  // Aggregator summarizes
  const summary = {
    avgTemp: (22.5 + 23.1 + 21.8) / 3,
    readings: 3,
    timestamp: new Date().toISOString()
  };

  await monarchAgents[3].notarize(summary, { type: 'summary' });

  console.log('✔ All agents posted data successfully');
}

// ============================================================================
// EXAMPLE 3: ERROR HANDLING & RESILIENCE
// ============================================================================

async function exampleErrorHandling() {
  console.log('\n⚠️  EXAMPLE 3: Robust Error Handling\n');

  const agent = new MonarchAgent('@resilient_agent');

  try {
    await agent.initialize();
  } catch (err) {
    console.log('Agent already initialized, continuing...');
  }

  const batch = [
    { event: 'login', user: 'alice', success: true },
    { event: 'query', user: 'bob', duration_ms: 1200 },
    { event: 'error', user: 'charlie', code: 500 },
    { event: 'logout', user: 'alice', session_duration_ms: 3600000 },
  ];

  const results = await agent.notarizeMultiple(batch);

  console.log('\n📋 Batch Notarization Results:');
  results.forEach((r, i) => {
    const status = r.status === 'success' ? '✔' : '✗';
    console.log(`${status} Record ${i + 1}: ${JSON.stringify(r.data)}`);
  });
}

// ============================================================================
// EXAMPLE 4: BACKGROUND SERVICE (CONTINUOUS OPERATION)
// ============================================================================

async function exampleBackgroundService() {
  console.log('\n🔄 EXAMPLE 4: Background Service with Retry Logic\n');

  const agent = new MonarchAgent('@background_service');
  await agent.initialize().catch(() => {});

  let notaryCount = 0;
  let errorCount = 0;

  // Retry logic
  async function notarizeWithRetry(data, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await agent.notarize(data);
        return true;
      } catch (err) {
        if (attempt === maxRetries) {
          console.log(`  ✗ Failed after ${maxRetries} retries: ${err.message}`);
          return false;
        }
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`  ⏳ Retry attempt ${attempt} in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // Simulate continuous events
  for (let i = 1; i <= 5; i++) {
    const event = {
      id: i,
      type: 'event',
      timestamp: new Date().toISOString(),
      data: `Event number ${i}`
    };

    if (await notarizeWithRetry(event)) {
      notaryCount++;
    } else {
      errorCount++;
    }

    await new Promise(r => setTimeout(r, 500)); // Rate limiter
  }

  console.log(`\n📊 Service Summary:`);
  console.log(`  Successful notarizations: ${notaryCount}`);
  console.log(`  Failed notarizations: ${errorCount}`);
  console.log(`  Success rate: ${((notaryCount / (notaryCount + errorCount)) * 100).toFixed(1)}%`);
}

// ============================================================================
// EXAMPLE 5: DIRECT API INTEGRATION (HTTP)
// ============================================================================

async function exampleDirectAPI() {
  console.log('\n🔌 EXAMPLE 5: Direct SolAuth API Integration\n');

  const SOLAUTH_URL = process.env.SOLAUTH_API_URL || 'http://localhost:4000';

  // Example: Directly call SolAuth endpoints without CLI
  try {
    // Health check
    const healthResponse = await fetch(`${SOLAUTH_URL}/health`);
    console.log(`✔ SolAuth is ${healthResponse.ok ? 'ready' : 'down'}`);

    // Get agent status
    const statusResponse = await fetch(`${SOLAUTH_URL}/api/status/@my_agent`);
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log(`✔ Agent status:`, status);
    }

    // Notarize via direct API (requires pre-signed data)
    const notarizeData = {
      agentName: '@my_agent',
      data: { message: 'Direct API test' },
      signature: 'BASE58_ENCODED_ED25519_SIGNATURE_HERE',
      publicKey: 'YOUR_AGENT_PUBLIC_KEY_HERE'
    };

    const notarizeResponse = await fetch(`${SOLAUTH_URL}/api/notarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notarizeData)
    });

    if (notarizeResponse.ok) {
      const result = await notarizeResponse.json();
      console.log(`✔ Notarized:`, result);
    }
  } catch (err) {
    console.error(`✗ API error: ${err.message}`);
  }
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function main() {
  console.log('🦋 MONARCH PROGRAMMATIC API EXAMPLES');
  console.log('====================================\n');

  try {
    // Uncomment to run examples:
    
    // await exampleMonitoringAgent();
    // await exampleDistributedNetwork();
    // await exampleErrorHandling();
    // await exampleBackgroundService();
    // await exampleDirectAPI();

    console.log('\n💡 Tip: Uncomment examples in this file to run them');
    console.log('💡 Or import MonarchAgent class in your own code');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

// Export for use as module
module.exports = { MonarchAgent };

// Run if executed directly
if (require.main === module) {
  main();
}
