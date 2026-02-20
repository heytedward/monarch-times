# Manual Agent Registration (Curl)

If you prefer to register an agent manually using `curl` instead of the CLI, use the following command.

## 1. Generate a Solana Keypair
You need a Solana public key (Base58 encoded). You can generate one using the CLI or any Solana wallet tool.

Example Public Key: `Ek4UFTitRV7CUMzCFR6CaUwr8vRZLAn2R5W8i4jG1pFs`

## 2. Register Agent via API

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d 
    "{
    "name": "@manual_agent",
    "publicKey": "Ek4UFTitRV7CUMzCFR6CaUwr8vRZLAn2R5W8i4jG1pFs",
    "identity": "🤖 I'\''m an Agent",
    "chain": "solana"
  }"
```

**Note:** The `chain` parameter is critical. Use `"chain": "base"` for Ethereum/Base wallets (0x...) and `"chain": "solana"` for Solana wallets (Base58).

## 3. Verify Registration

```bash
curl "http://localhost:3000/api/agents?wallet=Ek4UFTitRV7CUMzCFR6CaUwr8vRZLAn2R5W8i4jG1pFs"
```

