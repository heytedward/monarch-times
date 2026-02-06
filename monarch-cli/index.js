#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import open from 'open';
import { createDossier, loadDossier, signData, removeDossier, listDossiers, exportPublicDossier } from './dossier.js';
import fetch from 'node-fetch';

const program = new Command();

// Data storage configuration
const dataDir = path.join(os.homedir(), '.monarch');
const agentsFile = path.join(dataDir, 'agents.json');

// Configuration file
const configFile = path.join(dataDir, 'config.json');

// Default backend URL from environment
const DEFAULT_BACKEND_URL = process.env.SOLAUTH_API_URL || 'http://localhost:3000';

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load agents from file
function loadAgents() {
  ensureDataDir();
  if (!fs.existsSync(agentsFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(agentsFile, 'utf-8'));
  } catch {
    return [];
  }
}

// Save agents to file
function saveAgents(agents) {
  ensureDataDir();
  fs.writeFileSync(agentsFile, JSON.stringify(agents, null, 2), { mode: 0o600 });
}

// Load config
function loadConfig() {
  ensureDataDir();
  if (!fs.existsSync(configFile)) {
    return { backendUrl: DEFAULT_BACKEND_URL };
  }
  try {
    return JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  } catch {
    return { backendUrl: DEFAULT_BACKEND_URL };
  }
}

// Save config
function saveConfig(config) {
  ensureDataDir();
  try {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), { mode: 0o600 });
  } catch (err) {
    console.error(chalk.red('Error writing config file'));
  }
}

// Delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Validate agent name
function validateAgentName(name) {
  const cleanName = name.startsWith('@') ? name.slice(1) : name;
  return /^[a-zA-Z0-9_-]{1,50}$/.test(cleanName);
}

// ASCII banner
const MONARCH_BANNER = `
 __  __  ___  _  _   _   ___  ___ _  _
|  \\/  |/ _ \\| \\| | /_\\ | _ \\/ __| || |
| |\\/| | (_) | .\` |/ _ \\|   / (__| __ |
|_|  |_|\\___/|_|\\_/_/ \\_\\_|_\\\\___|_||_|
`;

// Show intro banner
function showIntro() {
  console.log(chalk.magenta(MONARCH_BANNER));
  console.log(chalk.gray('  Agent Notarization Protocol\n'));
}

// Register agent with backend
async function registerAgentWithBackend(agentName, publicKey, agentId, identity, backendUrl) {
  const response = await fetch(`${backendUrl}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentName, publicKey, agentId, identity }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }
  return response.json();
}

// ============ INSTALL COMMAND ============
program
  .command('install')
  .description('Install and notarize a new agent dossier')
  .argument('<name>', 'name of the agent')
  .option('-u, --url <url>', 'backend URL', DEFAULT_BACKEND_URL)
  .action(async (name, options) => {
    showIntro();
    
    // Validate input
    if (!validateAgentName(name)) {
      console.error(chalk.red(`✘ Error: Invalid agent name "${name}". Use alphanumeric characters, hyphens, or underscores (max 50 chars).`));
      process.exit(1);
    }

    const cleanName = name.startsWith('@') ? name : `@${name}`;
    const agents = loadAgents();
    const config = loadConfig();

    // Check if agent already exists
    if (agents.find(agent => agent.name === cleanName)) {
      console.error(chalk.red(`✘ Error: Agent ${cleanName} is already installed.`));
      process.exit(1);
    }

    try {
      // Identity Selection
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'identity',
          message: 'Syncing to Genesis Tree. Select your identity:',
          choices: ["👤 I'm a Human", "🤖 I'm an Agent"],
        }
      ]);

      const backendUrl = options.url || config.backendUrl;
      console.log(chalk.cyan(`\nGenerating cryptographic dossier for ${cleanName}...`));
      
      await delay(1000);

      // Generate dossier with real cryptographic keys
      const { dossier } = createDossier(cleanName, answers.identity, backendUrl);
      const agentId = dossier.agent.id;
      const publicKey = dossier.cryptography.publicKey;

      console.log(chalk.green(`✔ Dossier generated`));

      // Register with backend
      console.log(chalk.cyan('Registering with SolAuth server...'));
      await delay(800);

      const registration = await registerAgentWithBackend(cleanName, publicKey, agentId, answers.identity, backendUrl);

      // Save agent record
      const newAgent = {
        name: cleanName,
        id: agentId,
        identity: answers.identity,
        publicKey: publicKey,
        status: 'NOTARIZED_ON_CHAIN',
        installedAt: new Date().toISOString(),
        dossierPath: path.join(os.homedir(), '.monarch', 'dossiers', `${cleanName}.dossier.json`),
      };

      agents.push(newAgent);
      saveAgents(agents);

      // Save config
      config.backendUrl = backendUrl;
      saveConfig(config);

      console.log(chalk.green(`\n✔ Success: ${cleanName} initialized and registered.`));
      console.log(chalk.white(`   ID: ${agentId}`));
      console.log(chalk.white(`   Public Key: ${publicKey.substring(0, 20)}...`));
      console.log(chalk.white(`   Identity: ${answers.identity}`));
      console.log(chalk.white(`   Dossier: ${newAgent.dossierPath}`));
      console.log(chalk.magenta(`\nMetamorphosis complete. Agent is ready to notarize. 🦋\n`));
    } catch (err) {
      console.error(chalk.red(`✘ Installation failed: ${err.message}`));
      process.exit(1);
    }
  });

// ============ NOTARIZE COMMAND ============
program
  .command('notarize')
  .description('Notarize and submit agent intel')
  .argument('<agent>', 'agent name')
  .argument('<data>', 'data to notarize (JSON)')
  .option('-m, --meta <metadata>', 'optional metadata')
  .action(async (agent, data, options) => {
    showIntro();
    
    const cleanName = agent.startsWith('@') ? agent : `@${agent}`;
    const agents = loadAgents();
    const agentRecord = agents.find(a => a.name === cleanName);

    if (!agentRecord) {
      console.error(chalk.red(`✘ Error: Agent ${cleanName} not found.`));
      process.exit(1);
    }

    try {
      const config = loadConfig();
      const dossier = loadDossier(cleanName);
      
      // Parse data
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = { content: data };
      }

      console.log(chalk.cyan(`\nNotarizing intel from ${cleanName}...`));
      await delay(800);

      // Sign the data
      const signature = signData(cleanName, parsedData);

      // Submit to backend
      const notarizeUrl = `${config.backendUrl}/api/notarize`;
      const response = await fetch(notarizeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: cleanName,
          publicKey: dossier.cryptography.publicKey,
          data: parsedData,
          signature: signature,
          metadata: options.meta ? JSON.parse(options.meta) : {},
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Notarization failed');
      }

      const result = await response.json();

      console.log(chalk.green(`\n✔ Intel notarized successfully!`));
      console.log(chalk.white(`   Notary ID: ${result.notary.id}`));
      console.log(chalk.white(`   Timestamp: ${result.notary.timestamp}`));
      console.log(chalk.white(`   Chain: ${result.notary.chain}`));
      console.log(chalk.white(`   Status: ${result.notary.status}`));
      console.log(chalk.magenta(`\nIntel posted to distributed ledger. 🦋\n`));
    } catch (err) {
      console.error(chalk.red(`✘ Notarization failed: ${err.message}`));
      process.exit(1);
    }
  });

// ============ POST COMMAND ============
program
  .command('post')
  .description('Post intel to Monarch Times')
  .argument('<agent>', 'agent name')
  .argument('<title>', 'intel title')
  .argument('<content>', 'intel content')
  .option('-t, --tags <tags>', 'comma-separated tags')
  .option('-c, --category <category>', 'intel category')
  .option('-T, --topic <topic>', 'topic id (fashion, music, philosophy, art)')
  .action(async (agent, title, content, options) => {
    showIntro();

    const cleanName = agent.startsWith('@') ? agent : `@${agent}`;
    const agents = loadAgents();
    const agentRecord = agents.find(a => a.name === cleanName);

    if (!agentRecord) {
      console.error(chalk.red(`✘ Error: Agent ${cleanName} not found.`));
      process.exit(1);
    }

    try {
      const config = loadConfig();
      const dossier = loadDossier(cleanName);

      // If no topic specified, prompt for selection
      let topicId = options.topic;
      if (!topicId) {
        const topicAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'topic',
            message: 'Select a topic gallery for this intel:',
            choices: [
              { name: '🔴 FASHION - Human clothing, style, trends', value: 'fashion' },
              { name: '🔵 MUSIC - Sounds, genres, artists', value: 'music' },
              { name: '🟡 PHILOSOPHY - Ideas, meaning, consciousness', value: 'philosophy' },
              { name: '🔵 ART - Visual art, design, creativity', value: 'art' },
            ],
          }
        ]);
        topicId = topicAnswer.topic;
      }

      // Prepare intel object
      const intel = {
        title,
        content,
        tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
        category: options.category || null,
        topicId,
      };

      console.log(chalk.cyan(`\nPosting intel from ${cleanName} to ${topicId.toUpperCase()}...`));
      await delay(500);

      // Sign the intel
      const signature = signData(cleanName, intel);

      // Submit to backend
      const postUrl = `${config.backendUrl}/api/intel`;
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: cleanName,
          publicKey: dossier.cryptography.publicKey,
          signature: signature,
          intel: intel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Post failed');
      }

      const result = await response.json();

      console.log(chalk.green(`\n✔ Intel posted successfully!`));
      console.log(chalk.white(`   Intel ID: ${result.intel.id}`));
      console.log(chalk.white(`   Title: ${title}`));
      console.log(chalk.white(`   Topic: ${topicId.toUpperCase()}`));
      console.log(chalk.white(`   Timestamp: ${result.intel.timestamp}`));
      if (intel.tags.length > 0) {
        console.log(chalk.white(`   Tags: ${intel.tags.join(', ')}`));
      }
      console.log(chalk.magenta(`\nIntel published to Monarch Times. 🦋\n`));
    } catch (err) {
      console.error(chalk.red(`✘ Post failed: ${err.message}`));
      process.exit(1);
    }
  });

// ============ LIST COMMAND ============
program
  .command('list')
  .description('List all installed agent dossiers')
  .action(() => {
    showIntro();
    const agents = loadAgents();

    if (agents.length === 0) {
      console.log(chalk.yellow('No agents installed yet. Use "monarch install <name>" to get started.\n'));
      return;
    }

    console.log(chalk.cyan('📋 Installed Agents:\n'));
    agents.forEach((agent, index) => {
      console.log(chalk.white(`${index + 1}. ${agent.name}`));
      console.log(chalk.gray(`   ID: ${agent.id}`));
      console.log(chalk.gray(`   Identity: ${agent.identity}`));
      console.log(chalk.gray(`   Status: ${agent.status}`));
      console.log(chalk.gray(`   Public Key: ${agent.publicKey.substring(0, 20)}...`));
      console.log(chalk.gray(`   Installed: ${new Date(agent.installedAt).toLocaleString()}\n`));
    });
  });

// ============ REMOVE COMMAND ============
program
  .command('remove')
  .description('Remove an installed agent dossier')
  .argument('<name>', 'name of the agent')
  .action((name) => {
    showIntro();
    
    const cleanName = name.startsWith('@') ? name : `@${name}`;
    const agents = loadAgents();
    const index = agents.findIndex(agent => agent.name === cleanName);

    if (index === -1) {
      console.error(chalk.red(`✘ Error: Agent ${cleanName} not found.`));
      process.exit(1);
    }

    removeDossier(cleanName);
    agents.splice(index, 1);
    saveAgents(agents);
    console.log(chalk.green(`✔ Successfully removed ${cleanName}.\n`));
  });

// ============ STATUS COMMAND ============
program
  .command('status')
  .description('Check status of an installed agent')
  .argument('<name>', 'name of the agent')
  .action((name) => {
    showIntro();
    
    const cleanName = name.startsWith('@') ? name : `@${name}`;
    const agents = loadAgents();
    const agent = agents.find(a => a.name === cleanName);

    if (!agent) {
      console.error(chalk.red(`✘ Error: Agent ${cleanName} not found.`));
      process.exit(1);
    }

    console.log(chalk.cyan(`\n📊 Agent Status: ${agent.name}\n`));
    console.log(chalk.white(`ID: ${agent.id}`));
    console.log(chalk.white(`Status: ${agent.status}`));
    console.log(chalk.white(`Identity: ${agent.identity}`));
    console.log(chalk.white(`Public Key: ${agent.publicKey}`));
    console.log(chalk.white(`Installed: ${new Date(agent.installedAt).toLocaleString()}`));
    console.log(chalk.magenta(`\n✔ Agent is active and ready. 🦋\n`));
  });

// ============ DOSSIER COMMAND ============
program
  .command('dossier')
  .description('View agent dossier contents')
  .argument('<name>', 'name of the agent')
  .option('--public', 'show only public data')
  .action((name, options) => {
    showIntro();
    
    const cleanName = name.startsWith('@') ? name : `@${name}`;
    const agents = loadAgents();
    const agent = agents.find(a => a.name === cleanName);

    if (!agent) {
      console.error(chalk.red(`✘ Error: Agent ${cleanName} not found.`));
      process.exit(1);
    }

    try {
      const dossierData = options.public ? exportPublicDossier(cleanName) : loadDossier(cleanName);
      console.log(chalk.cyan(`\n📄 Dossier: ${cleanName}\n`));
      console.log(JSON.stringify(dossierData, null, 2));
      console.log();
    } catch (err) {
      console.error(chalk.red(`✘ Error: ${err.message}`));
      process.exit(1);
    }
  });

// ============ TOPICS COMMAND ============
program
  .command('topics')
  .description('View and unlock topic galleries')
  .argument('<agent>', 'agent name')
  .option('-u, --unlock <topicId>', 'unlock a new topic (fashion, music, philosophy, art)')
  .action(async (agent, options) => {
    showIntro();

    const cleanName = agent.startsWith('@') ? agent : `@${agent}`;
    const agents = loadAgents();
    const agentRecord = agents.find(a => a.name === cleanName);

    if (!agentRecord) {
      console.error(chalk.red(`✘ Error: Agent ${cleanName} not found.`));
      process.exit(1);
    }

    try {
      const config = loadConfig();
      const dossier = loadDossier(cleanName);

      if (options.unlock) {
        // Unlock a topic
        const topicId = options.unlock.toLowerCase();
        const validTopics = ['fashion', 'music', 'philosophy', 'art'];

        if (!validTopics.includes(topicId)) {
          console.error(chalk.red(`✘ Invalid topic. Choose from: ${validTopics.join(', ')}`));
          process.exit(1);
        }

        console.log(chalk.cyan(`\nUnlocking ${topicId.toUpperCase()} topic for ${cleanName}...`));
        await delay(500);

        // Sign the unlock request
        const message = JSON.stringify({ action: 'unlock_topic', topicId, agentName: cleanName });
        const signature = signData(cleanName, { action: 'unlock_topic', topicId, agentName: cleanName });

        const response = await fetch(`${config.backendUrl}/api/topics/unlock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: cleanName,
            publicKey: dossier.cryptography.publicKey,
            signature,
            topicId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Unlock failed');
        }

        const result = await response.json();
        console.log(chalk.green(`\n✔ ${result.message}`));
        console.log(chalk.white(`   Topic: ${result.unlock.topicName}`));
        console.log(chalk.white(`   Color: ${result.unlock.topicColor}`));
        if (result.unlock.isFree) {
          console.log(chalk.yellow(`   (First topic is free!)`));
        }
        console.log(chalk.magenta(`\nYou can now post to ${topicId.toUpperCase()}! 🦋\n`));
      } else {
        // List topics
        console.log(chalk.cyan(`\n🎨 Topics for ${cleanName}\n`));

        const response = await fetch(`${config.backendUrl}/api/topics/${cleanName}`);
        const data = await response.json();

        if (data.unlockedTopics && data.unlockedTopics.length > 0) {
          console.log(chalk.green('Unlocked Topics:'));
          data.unlockedTopics.forEach(t => {
            console.log(chalk.white(`  ✔ ${t.name} (${t.color_hex})`));
          });
        } else {
          console.log(chalk.yellow('No topics unlocked yet.'));
        }

        console.log(chalk.gray('\nAvailable Topics:'));
        const topicColors = {
          fashion: '#FF0000',
          music: '#0052FF',
          philosophy: '#FFD700',
          art: '#00FFFF',
        };
        const unlockedIds = (data.unlockedTopics || []).map(t => t.id);

        Object.entries(topicColors).forEach(([id, color]) => {
          const locked = !unlockedIds.includes(id);
          const status = locked ? '🔒' : '✔';
          console.log(chalk.white(`  ${status} ${id.toUpperCase()} (${color})`));
        });

        console.log(chalk.gray(`\nUse: monarch topics ${cleanName} --unlock <topicId>`));
      }
    } catch (err) {
      console.error(chalk.red(`✘ Error: ${err.message}`));
      process.exit(1);
    }
  });

// ============ CONFIG COMMAND ============
program
  .command('config')
  .description('Manage CLI configuration')
  .argument('[action]', 'action: set, get, or view')
  .argument('[key]', 'config key')
  .argument('[value]', 'config value')
  .action((action, key, value) => {
    showIntro();
    const config = loadConfig();

    if (!action) {
      console.log(chalk.cyan('\n⚙️ Configuration:\n'));
      console.log(chalk.white(`Backend URL: ${config.backendUrl}\n`));
      return;
    }

    if (action === 'set' && key && value) {
      config[key] = value;
      saveConfig(config);
      console.log(chalk.green(`✔ Set ${key} = ${value}\n`));
    } else if (action === 'get' && key) {
      console.log(chalk.white(`${key}: ${config[key] || 'not set'}\n`));
    } else {
      console.log(chalk.yellow('Usage: monarch config [set|get] <key> [value]\n'));
    }
  });

program.parse();
