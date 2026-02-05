# Solauth Integration — monarch-times

## Purpose
monarch-times is a React + Vite frontend that displays and manages Solana-based "agents" and their cards. This document explains what the frontend expects from Solauth so it can function as our backend Sol engine (authentication, signature verification, agent management).

## Relevant code locations
- [monarch-times/src/hooks/useSolanaAgent.ts](monarch-times/src/hooks/useSolanaAgent.ts)
- [monarch-times/src/store/agentStore.tsx](monarch-times/src/store/agentStore.tsx)
- UI components that rely on auth/agent data: [monarch-times/src/components/AgentProfile.tsx](monarch-times/src/components/AgentProfile.tsx), [monarch-times/src/components/AgentProfileModal.tsx](monarch-times/src/components/AgentProfileModal.tsx)

## High-level requirements for Solauth
- Provide an HTTP(S) API for authentication using Solana public keys + message signatures (ed25519, base58 encoding).
- Return a session token (recommended: JWT) after verifying a signed challenge so the frontend can persist sessions.
- Expose basic agent CRUD endpoints so the frontend can create and fetch agent profiles tied to a public key.
- Support CORS for the frontend origin (e.g., `http://localhost:5173`) and standard security practices (HTTPS, rate-limiting).

## Suggested API endpoints & payloads
1) Request a challenge
- POST `/auth/request-challenge`
- Body: `{ "publicKey": "<base58_pubkey>" }`
- Response: `{ "challenge": "<random-string>", "ttl": 300 }`

2) Verify signature / sign in
- POST `/auth/verify`
- Body: `{ "publicKey": "<base58_pubkey>", "signature": "<base58_signature>", "challenge": "<challenge>" }`
- Response: `{ "token": "<jwt>", "expiresIn": 3600, "agent": { ... } }`

3) Refresh token (optional)
- POST `/auth/refresh` with current token -> new token

4) Agent management
- POST `/agents` — create agent. Body includes metadata and a signature proving ownership of the `publicKey`.
- GET `/agents/:id` — fetch agent data.
- GET `/agents?owner=<pubkey>` — list agents by owner.

Notes:
- Tokens should include the `sub` claim as the user's Solana public key.
- Signatures and public keys should be base58-encoded strings to match Solana tooling.

## Security details
- Challenge TTL: short (e.g., 5 minutes).
- Use `tweetnacl`/ed25519 verification server-side to validate signatures.
- Use HTTPS and standard JWT best practices (rotate secrets, short expirations, refresh tokens).
- CORS must allow requests from the frontend host(s).

## Environment variables expected by the frontend
- `REACT_APP_SOLAUTH_URL` — base URL for Solauth API.
- `REACT_APP_SOLANA_RPC_URL` — Solana RPC endpoint used by wallet operations in the frontend.

## Developer notes for the Solauth author
- The frontend calls Solauth from `useSolanaAgent` and stores session tokens in the `agentStore`.
- Payloads use base58 for public keys and signatures (consistent with Solana wallets).
- Provide a small test account / sample JWT and a test challenge flow so the frontend developer can verify integration locally.
- Optionally support webhooks for events like `agent.created` if you want server-side indexing or notifications.

## Minimal acceptance criteria
- Solauth can accept a `publicKey`, issue a short-lived challenge, verify a client signature, and return a session token.
- The frontend can call `/agents` to create an agent and then fetch it back via `/agents/:id`.
- CORS and HTTPS are configured so local development (`localhost`) works.

## Next steps
- Provide the final API spec (paths, auth headers, token format) and a test token for local development.

---
If you want, I can also generate an OpenAPI spec for these endpoints or add an example client snippet the frontend can use.
