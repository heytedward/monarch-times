# 🦋 Monarch Protocol – Third-Party Integration Guide

**For developers embedding Monarch into their own projects/products**

---

## Overview

Monarch can be integrated in **4 different ways** depending on your tech stack and needs:

1. **Node.js Module** — Import functions directly
2. **REST API** — HTTP calls to a Monarch backend server
3. **CLI Subprocess** — Shell commands from any language
4. **Docker Container** — Containerized agent service

---

## Integration Method 1: Node.js Module Import

Use Monarch as a library in your Node.js application.

### Setup

```bash
# Clone Monarch into your project
git clone https://github.com/your-org/monarch-cli.git ./vendor/monarch

# Or install from npm (if published)
npm install @monarch/protocol

# Import modules
const { installAgent, notarizeData } = require('./vendor/monarch/dossier.js');
```

### Example: Simple Agent Notarization

```javascript
const fs = require('fs');
const path = require('path');
const { createDossier, signData, loadDossier } = require('./vendor/monarch/dossier.js');

// 1. Create agent dossier
createDossier('@my_app_agent', 'http://your-solauth-server:4000');

// 2. Load dossier (public key)
const dossier = loadDossier('@my_app_agent');
console.log('Agent ID:', dossier.agent.id);
console.log('Public Key:', dossier.cryptography.publicKey);

// 3. Sign some data in your app
const dataToNotarize = {
  event: 'user_signup',
  userId: '123',
  timestamp: new Date().toISOString()
};

const signature = signData('@my_app_agent', dataToNotarize);

// 4. Send to your Monarch backend
const response = await fetch('http://your-solauth-server:4000/api/notarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentName: '@my_app_agent',
    publicKey: dossier.cryptography.publicKey,
    data: dataToNotarize,
    signature: signature,
    metadata: { source: 'my_app', version: '1.0' }
  })
});

const result = await response.json();
console.log('Notary ID:', result.notary.id);
```

### Example: Express.js Middleware

```javascript
const express = require('express');
const { loadDossier, signData } = require('./vendor/monarch/dossier.js');

const app = express();

// Middleware: Auto-notarize sensitive events
const notarizeMiddleware = (agentName, monarchUrl) => {
  return async (req, res, next) => {
    // Store original send
    const originalSend = res.send;

    res.send = async function (data) {
      // After response is prepared, notarize it
      const eventData = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      };

      try {
        const dossier = loadDossier(agentName);
        const signature = signData(agentName, eventData);

        await fetch(`${monarchUrl}/api/notarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: agentName,
            publicKey: dossier.cryptography.publicKey,
            data: eventData,
            signature: signature
          })
        });
      } catch (err) {
        console.error('Notarization failed:', err.message);
        // Continue anyway, don't break the response
      }

      // Send response
      return originalSend.call(this, data);
    };

    next();
  };
};

// Use middleware
app.use(notarizeMiddleware('@api_audit', process.env.SOLAUTH_API_URL));

app.get('/api/data', (req, res) => {
  res.json({ data: 'sensitive information' });
  // Automatically notarized!
});

app.listen(3000);
```

---

## Integration Method 2: REST API Calls

If you don't want Monarch as a Node.js dependency, just call the backend HTTP API.

### Setup

Your backend must be accessible at `SOLAUTH_API_URL`. This could be:
- Local: `http://localhost:4000`
- Your cloud: `https://monarch.mycompany.com`
- SaaS: `https://monarch-api.io`

### Example: Python

```python
import requests
import json
import subprocess
from pathlib import Path

class MonarchAgent:
    def __init__(self, agent_name, backend_url="http://localhost:4000"):
        self.agent_name = agent_name
        self.backend_url = backend_url
        self.dossier = None

    def install(self):
        """Create the agent on Monarch backend"""
        # Use CLI to generate keypair locally
        result = subprocess.run(
            f"node ./monarch/index.js install {self.agent_name}",
            shell=True,
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            raise Exception(f"Installation failed: {result.stderr}")
        
        # Load dossier to get public key
        dossier_path = Path.home() / ".monarch" / "dossiers" / f"{self.agent_name}.dossier.json"
        with open(dossier_path) as f:
            self.dossier = json.load(f)

    def notarize(self, data, metadata=None):
        """Sign data locally and post to Monarch backend"""
        # Use CLI to sign data
        result = subprocess.run(
            ['node', './monarch/index.js', 'notarize', self.agent_name, json.dumps(data)],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            # Parse notary ID from output
            import re
            match = re.search(r'NOT-\w+-\w+', result.stdout)
            if match:
                return match.group(0)
        else:
            raise Exception(f"Notarization failed: {result.stderr}")

# Usage in Python app
agent = MonarchAgent('@datasync_python')
agent.install()
notary_id = agent.notarize({
    'event': 'data_sync',
    'records': 1000,
    'timestamp': '2026-02-05T15:00:00Z'
})
print(f"Data notarized with ID: {notary_id}")
```

### Example: Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os/exec"
)

type MonarchAgent struct {
    Name       string
    BackendURL string
}

func (m *MonarchAgent) Install() error {
    cmd := exec.Command("node", "monarch/index.js", "install", m.Name)
    return cmd.Run()
}

func (m *MonarchAgent) Notarize(data interface{}) (string, error) {
    // Marshal data
    dataBytes, _ := json.Marshal(data)
    
    // Use CLI to sign
    cmd := exec.Command("node", "monarch/index.js", "notarize", m.Name, string(dataBytes))
    output, err := cmd.CombinedOutput()
    if err != nil {
        return "", err
    }
    
    // Parse notary ID from output
    // ... implement regex parsing ...
    return "NOT-XXXXX-YYYYY", nil
}

func main() {
    agent := &MonarchAgent{
        Name:       "@service_go",
        BackendURL: "http://localhost:4000",
    }
    
    agent.Install()
    notaryID, _ := agent.Notarize(map[string]interface{}{
        "event": "startup",
        "version": "1.2.0",
    })
    fmt.Printf("Notarized: %s\n", notaryID)
}
```

### Example: Rust

```rust
use std::process::Command;
use serde_json::json;

struct MonarchAgent {
    name: String,
    backend_url: String,
}

impl MonarchAgent {
    fn new(name: &str, backend_url: &str) -> Self {
        MonarchAgent {
            name: name.to_string(),
            backend_url: backend_url.to_string(),
        }
    }

    fn install(&self) -> Result<(), String> {
        let output = Command::new("node")
            .args(&["monarch/index.js", "install", &self.name])
            .output()
            .map_err(|e| e.to_string())?;
        
        if !output.status.success() {
            return Err(String::from_utf8(output.stderr).unwrap());
        }
        Ok(())
    }

    fn notarize(&self, data: &serde_json::Value) -> Result<String, String> {
        let data_str = data.to_string();
        let output = Command::new("node")
            .args(&["monarch/index.js", "notarize", &self.name, &data_str])
            .output()
            .map_err(|e| e.to_string())?;
        
        let stdout = String::from_utf8(output.stdout).unwrap();
        // Parse notary ID from stdout
        Ok("NOT-XXXXX-YYYYY".to_string())
    }
}

fn main() {
    let agent = MonarchAgent::new("@service_rust", "http://localhost:4000");
    agent.install().unwrap();
    
    let data = json!({
        "event": "transaction",
        "amount": 1000,
        "timestamp": "2026-02-05T15:00:00Z"
    });
    
    match agent.notarize(&data) {
        Ok(notary_id) => println!("Notarized: {}", notary_id),
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

---

## Integration Method 3: CLI Subprocess (Any Language)

The simplest approach: just execute the CLI as a subprocess.

### Shell Script

```bash
#!/bin/bash

AGENT="@my_agent"
BACKEND_URL="http://localhost:4000"

# Set environment
export SOLAUTH_API_URL=$BACKEND_URL

# Install agent
node monarch/index.js install $AGENT

# Create and notarize data
DATA='{"event":"alert","severity":"high","message":"System overload"}'
node monarch/index.js notarize $AGENT "$DATA"

# Check status
node monarch/index.js status $AGENT

# List all agents
node monarch/index.js list
```

### Java

```java
import java.io.*;

public class MonarchIntegration {
    public static void main(String[] args) throws Exception {
        String agent = "@java_service";
        String backendUrl = "http://localhost:4000";
        
        // Set env var
        ProcessBuilder pb = new ProcessBuilder(
            "node", "monarch/index.js", "install", agent
        );
        pb.environment().put("SOLAUTH_API_URL", backendUrl);
        
        // Execute
        Process p = pb.start();
        BufferedReader reader = new BufferedReader(
            new InputStreamReader(p.getInputStream())
        );
        
        String line;
        while ((line = reader.readLine()) != null) {
            System.out.println(line);
        }
        
        int exitCode = p.waitFor();
        if (exitCode == 0) {
            System.out.println("Agent installed successfully");
        }
    }
}
```

### C#/.NET

```csharp
using System.Diagnostics;

class MonarchIntegration {
    static void Main() {
        string agent = "@dotnet_service";
        string backendUrl = "http://localhost:4000";
        
        var processInfo = new ProcessStartInfo {
            FileName = "node",
            Arguments = $"monarch/index.js install {agent}",
            UseShellExecute = false,
            RedirectStandardOutput = true,
            CreateNoWindow = true,
            EnvironmentVariables = { 
                { "SOLAUTH_API_URL", backendUrl } 
            }
        };
        
        using (var process = Process.Start(processInfo)) {
            var output = process.StandardOutput.ReadToEnd();
            process.WaitForExit();
            
            if (process.ExitCode == 0) {
                Console.WriteLine("Success: " + output);
            }
        }
    }
}
```

---

## Integration Method 4: Docker Container

Deploy Monarch as a containerized service.

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy Monarch files
COPY package.json package.json
COPY index.js index.js
COPY server.js server.js
COPY dossier.js dossier.js

# Install dependencies
RUN npm install

# Expose API port
EXPOSE 4000

# Environment variables
ENV SOLAUTH_API_URL=http://localhost:4000
ENV NODE_ENV=production

# Start server
CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  monarch-backend:
    build: .
    ports:
      - "4000:4000"
    environment:
      SOLAUTH_API_URL: http://localhost:4000
      NODE_ENV: production
    volumes:
      - monarch_data:/root/.monarch
    container_name: monarch-api

  your_app:
    build: ./your-app
    ports:
      - "3000:3000"
    environment:
      SOLAUTH_API_URL: http://monarch-backend:4000
    depends_on:
      - monarch-backend
    container_name: your-app

volumes:
  monarch_data:
```

**Run:**
```bash
docker-compose up -d
# Monarch API available at http://localhost:4000
# Your app can reach it at http://monarch-backend:4000
```

---

## Integration Patterns by Use Case

### Pattern 1: Audit Logging

Automatically notarize all database writes.

```javascript
// Intercept at database layer
db.on('write', async (table, record) => {
  const notarization = {
    action: 'write',
    table: table,
    id: record.id,
    timestamp: new Date().toISOString()
  };
  
  const agent = await getOrCreateAgent(`@db_audit_${table}`);
  await agent.notarize(notarization);
});
```

### Pattern 2: Distributed Tracing

Track API calls across microservices.

```javascript
// In each service
app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'] || generateId();
  
  res.on('finish', async () => {
    await notarizeEvent({
      traceId,
      service: process.env.SERVICE_NAME,
      endpoint: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - req.start
    });
  });
  
  next();
});
```

### Pattern 3: Compliance Reporting

Build an immutable activity log for auditors.

```javascript
// Notarize access events
async function logAccess(userId, resource, action) {
  const agent = await getAgent('@compliance_logger');
  
  await agent.notarize({
    type: 'access',
    userId,
    resource,
    action,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
}
```

### Pattern 4: Real-Time Alerts

Notarize security alerts for tamper-proof evidence.

```javascript
// Security monitoring system
monitor.on('suspicious_activity', async (alert) => {
  const agent = await getAgent('@security_alerts');
  
  const notaryId = await agent.notarize({
    severity: alert.severity,
    detection: alert.type,
    evidence: alert.data,
    timestamp: new Date().toISOString()
  });
  
  // Alert is now permanently notarized
  console.log(`Security alert notarized: ${notaryId}`);
});
```

---

## Configuration by Deployment

### Development (Local)

```env
SOLAUTH_API_URL=http://localhost:4000
MONARCH_DATA_DIR=~/.monarch
LOG_LEVEL=debug
```

**Start your backend:**
```bash
npm run dev
```

### Staging (Cloud)

```env
SOLAUTH_API_URL=https://monarch-staging.mycompany.com
MONARCH_DATA_DIR=/var/monarch
LOG_LEVEL=info
```

### Production (Distributed)

```env
SOLAUTH_API_URL=https://monarch-api.mycompany.com
MONARCH_DATA_DIR=/secure/monarch
LOG_LEVEL=warn
# Add rate limiting, auth tokens if needed
```

---

## Comparison: Which Method to Use?

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Node.js Module** | Direct access, low latency, no subprocess overhead | Requires Node.js, direct dependency | Node.js + Express apps, microservices |
| **REST API** | Language-agnostic, decoupled, easy to scale | HTTP overhead, need running backend | Microservices, multi-language teams, cloud |
| **CLI Subprocess** | Simplest, works from any language, no installation | Subprocess overhead, parsing output | Quick scripts, one-off jobs, testing |
| **Docker** | Portable, isolated, production-ready | Container overhead, orchestration needed | Cloud deployments, Kubernetes, multiple services |

---

## Example: Multi-Language Microservices

```
┌─────────────┐
│  Node.js    │  Uses: Module import
│  API Server │  Agent: @api_auth
└──────┬──────┘
       │
       │ HTTP to
       │
┌──────▼──────────────┐
│  Monarch Backend    │  Notarizes signatures
│  (http:4000)        │
└──────┬──────────────┘
       │
       │ References
       │
   ┌───┴────────────────────────────┐
   │                                │
┌──▼────────────┐         ┌─────────▼──┐
│   Python      │         │    Go      │
│   Service     │         │  Service   │
│   Agent:      │         │  Agent:    │
│ @py_etl       │         │ @go_api    │
│ Uses: CLI     │         │ Uses: REST │
└───────────────┘         └────────────┘
```

Each service:
- Creates its own agent during startup
- Notarizes its own important operations
- Can verify other agents' notarizations if needed

---

## Getting Started

1. **Choose your integration method** based on your tech stack
2. **Point to your Monarch backend** via `SOLAUTH_API_URL`
3. **Create an agent** for your service: `install @my_service`
4. **Start notarizing** events/operations in your code
5. **Verify** notarizations can be retrieved from the ledger

---

## Reference: Standard Environment Variables

```bash
# Required
SOLAUTH_API_URL=http://your-backend:4000

# Optional
MONARCH_DATA_DIR=/path/to/data
LOG_LEVEL=info
DEBUG=monarch:*
BACKEND_TIMEOUT=5000
```

---

**Questions? Check [QUICKSTART.md](QUICKSTART.md) for CLI usage or [SOLAUTH_INTEGRATION_SPEC.md](SOLAUTH_INTEGRATION_SPEC.md) for API details.**
