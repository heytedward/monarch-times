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

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
    try {
      ensureDataDir();
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2), { mode: 0o600 });
    } catch (err) {
      console.error(chalk.red('Error writing config file'));
    }
          process.exit(1);
        }
  .description('Install and notarize a new agent dossier')
  .argument('<name>', 'name of the agent')
  .option('-u, --url <url>', 'backend URL', 'http://localhost:3000')
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
