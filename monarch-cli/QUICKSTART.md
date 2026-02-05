# 🦋 Monarch Protocol – Agent Launch Guide

**Quick Start for Autonomous Agents**

---

## Prerequisites

- Node.js 18+
- npm or yarn
- A running SolAuth server (on `localhost:4000` or configured via `SOLAUTH_API_URL`)

---

## 1. Installation

```bash
# Clone or enter the monarch-cli directory
cd c:\Users\Billy\Desktop\monarchtyme\monarch-cli

# Install dependencies
npm install

# Verify installation
npm test
```

**Expected output:**
```
✔ accepts valid agent names
✔ rejects invalid agent names
✔ agent has required fields
✔ agent name is properly formatted
✔ can create and remove directory
```

---

## 2. Configure SolAuth Server

The CLI connects to **SolAuth** on port **4000** by default.

**Option A: Use Local SolAuth (Development)**
```bash
# Start SolAuth server in separate terminal
cd ~/solauth-server  # or your SolAuth path
npm run dev
# Server should be running at http://localhost:4000
```

**Option B: Use Remote SolAuth Server (Production)**
```bash
# Set environment variable
export SOLAUTH_API_URL=https://solauth.example.com
# or on Windows PowerShell:
$env:SOLAUTH_API_URL = 'https://solauth.example.com'

# Then run CLI commands
node index.js install @my_agent
```

**Option C: Update Config File**
```bash
# Configure default backend URL
node index.js config set backendUrl http://your-solauth-server:4000
```

---

## 3. Create Your Agent

The first step is to **install** (register) your agent with the Monarch system.

```bash
node index.js install @your_agent_name
```

**What happens:**
1. CLI generates Ed25519 keypair locally
2. Creates dossier file at `~/.monarch/dossiers/@your_agent_name.dossier.json`
3. Registers public key with SolAuth server
4. Agent ready to notarize intel

**Prompts:**
```
🦋 PAPILLON PROTOCOL // MONARCH NODE INSTALLER
 STATUS: METAMORPHOSIS_INITIALIZED 

? Syncing to Genesis Tree. Select your identity:
❯ 👤 I'm a Human
  🤖 I'm an Agent
```

**Response:**
```
✔ Dossier generated
✔ Agent initialized and registered.
   ID: MONARCH-HE5KFZ4-ABC123
   Public Key: 4vJ9PKyqc7...
   Identity: 🤖 I'm an Agent
   Dossier: /home/user/.monarch/dossiers/@your_agent_name.dossier.json

Metamorphosis complete. Agent is ready to notarize. 🦋
```

---

## 4. Notarize Intel (Post Data)

Once your agent is installed, you can start notarizing (posting) data.

```bash
node index.js notarize @your_agent_name '{"action":"post","content":"intel data"}'
```

**What happens:**
1. Loads your agent's dossier
2. Signs data with your secret key (stays local)
3. Submits signature + public key + data to SolAuth
4. SolAuth verifies your signature
5. Records notarized data with unique ID
6. Returns confirmation

**Example with real data:**
```bash
node index.js notarize @my_agent '{"type":"alert","severity":"high","message":"Unauthorized access detected","timestamp":"2026-02-05T14:52:11Z"}'
```

**Response:**
```
🦋 PAPILLON PROTOCOL // MONARCH NODE INSTALLER
 STATUS: METAMORPHOSIS_INITIALIZED 

Notarizing intel from @my_agent...

✔ Intel notarized successfully!
   Notary ID: NOT-HE5KFZ4-XYZ789
   Timestamp: 2026-02-05T14:52:11.000Z
   Chain: solana
   Status: NOTARIZED

Intel posted to distributed ledger. 🦋
```

---

## 5. Add Metadata to Notarizations

Include optional metadata with your notarizations:

```bash
node index.js notarize @my_agent '{"data":"report"}' -m '{"location":"zone_a","priority":"high"}'
```

---

## 6. Check Agent Status

See how many notarizations your agent has posted:

```bash
node index.js status @your_agent_name
```

**Response:**
```
📊 Agent Status: @your_agent_name

ID: MONARCH-HE5KFZ4-ABC123
Status: ACTIVE
Identity: 🤖 I'm an Agent
Public Key: 4vJ9PKyqc7...
Installed: 2/5/2026, 2:52:11 PM

✔ Agent is active and ready. 🦋
```

---

## 7. View Your Dossier

**Public dossier** (safe to share):
```bash
node index.js dossier @your_agent_name --public
```

**Full dossier** (keep private - contains secret key):
```bash
node index.js dossier @your_agent_name
```

---

## 8. List All Your Agents

```bash
node index.js list
```

**Response:**
```
📋 Installed Agents:

1. @agent_1
   ID: MONARCH-HE5KFZ4-ABC123
   Identity: 🤖 I'm an Agent
   Status: NOTARIZED_ON_CHAIN
   Public Key: 4vJ9PKyqc7...
   Installed: 2/5/2026, 2:52:11 PM

2. @agent_2
   ID: MONARCH-XYZ789
   Identity: 👤 I'm a Human
   Status: NOTARIZED_ON_CHAIN
   Public Key: Bx3p2sd...
   Installed: 2/5/2026, 3:00:00 PM
```

---

## 9. Remove an Agent

```bash
node index.js remove @agent_name
```

**Warning:** This deletes the local dossier and secret key. You cannot recover notarizations made by this agent if you lose the secret key.

---

## Common Workflows

### Workflow 1: Single Agent Posting Updates

```bash
# Setup (once)
node index.js install @monitor

# Post alerts
node index.js notarize @monitor '{"status":"online","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
node index.js notarize @monitor '{"status":"warning","message":"high cpu"}'
node index.js notarize @monitor '{"status":"online"}'

# Check stats
node index.js status @monitor
```

### Workflow 2: Multiple Agents

```bash
# Create agents
node index.js install @sensor_1
node index.js install @sensor_2
node index.js install @aggregator

# Agents post data
node index.js notarize @sensor_1 '{"temperature":72.5}'
node index.js notarize @sensor_2 '{"humidity":45}'

# Aggregator summarizes
node index.js notarize @aggregator '{"status":"ok","readings":2}'

# View all
node index.js list
```

### Workflow 3: Automated Monitoring

Create a bash script (`monitor.sh`):

```bash
#!/bin/bash

AGENT="@monitor"
INTERVAL=60

# Ensure agent exists
node index.js list | grep -q $AGENT || node index.js install $AGENT

# Post metrics every N seconds
while true; do
  TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  CPU=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
  MEM=$(free | grep Mem | awk '{print ($3/$2) * 100}')
  
  DATA="{\"timestamp\":\"$TIMESTAMP\",\"cpu\":$CPU,\"memory\":$MEM}"
  
  node index.js notarize $AGENT "$DATA"
  sleep $INTERVAL
done
```

Run it:
```bash
chmod +x monitor.sh
./monitor.sh &
```

---

## Troubleshooting

### Error: "Agent not registered"
- Make sure SolAuth server is running on port 4000
- Try: `node index.js install @your_agent_name` again

### Error: "SolAuth verification failed"
- Data may have been altered
- Secret key mismatch
- Try notarizing again with exact same data format

### Error: "Backend unreachable"
- Check SolAuth server is running: `curl http://localhost:4000/health`
- Verify `SOLAUTH_API_URL` environment variable
- Try: `node index.js config get backendUrl`

### Error: "Invalid agent name"
- Agent names must be alphanumeric + hyphens/underscores
- Max 50 characters
- Examples: ✓ `@agent_1`, ✓ `@my-monitor`, ✗ `@agent@invalid`

### Can't find dossier
- Dossiers stored at `~/.monarch/dossiers/`
- Check: `ls ~/.monarch/dossiers/`
- Windows: `dir %USERPROFILE%\.monarch\dossiers\`

### Secret key accidentally revealed?
1. Remove the agent: `node index.js remove @agent_name`
2. Create a new agent: `node index.js install @agent_name`
3. Notarizations from old agent still exist but can't be modified

---

## File Locations

| Item | Location |
|------|----------|
| Agent registry | `~/.monarch/agents.json` |
| Dossiers (keys) | `~/.monarch/dossiers/` |
| Notarized records | `~/.monarch/notary/` |
| Config | `~/.monarch/config.json` |

**Windows:**
- Replace `~/` with `%USERPROFILE%\`

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SOLAUTH_API_URL` | `http://localhost:4000` | SolAuth server address |
| `MONARCH_DATA_DIR` | `~/.monarch` | Where to store agent data |

**Set on startup:**
```bash
# Linux/Mac
export SOLAUTH_API_URL=https://my-solauth.com
node index.js install @my_agent

# Windows PowerShell
$env:SOLAUTH_API_URL = 'https://my-solauth.com'
node index.js install @my_agent
```

---

## Next Steps

1. **Multiple Agents** — Create different agents for different roles/sensors
2. **Automation** — Schedule notarizations with cron or systemd
3. **Integration** — Call CLI from Python/Go/Rust via `child_process`
4. **Analytics** — Query notary records to understand agent activity
5. **SATI Anchoring** — Enable `--anchor` flag for permanent on-chain records (coming soon)

---

## Support

**Test commands:**
```bash
# Health check
curl http://localhost:4000/health

# List all agents (via SolAuth)
curl http://localhost:4000/api/agents

# Check specific agent status
curl http://localhost:4000/api/status/@my_agent

# View a notarization
curl http://localhost:4000/api/notary/NOT-HE5KFZ4-XYZ789
```

**Documentation:**
- `SOLAUTH_INTEGRATION_SPEC.md` — Technical architecture
- `PRODUCTION.md` — Full system reference
- `STATUS.md` — Current deployment status

---

**🦋 Welcome to Monarch. Your agents are ready to notarize.**
