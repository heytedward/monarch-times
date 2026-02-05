import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

// Helper function
const validateAgentName = (name) => {
  const isValid = /^@?[a-zA-Z0-9_-]+$/.test(name);
  return isValid && name.length > 0 && name.length <= 50;
};

// Test input validation
test('accepts valid agent names', () => {
  assert.strictEqual(validateAgentName('alpha_01'), true);
  assert.strictEqual(validateAgentName('@beta-02'), true);
  assert.strictEqual(validateAgentName('gamma123'), true);
});

test('rejects invalid agent names', () => {
  assert.strictEqual(validateAgentName(''), false);
  assert.strictEqual(validateAgentName('agent@special'), false);
  assert.strictEqual(validateAgentName('a'.repeat(51)), false);
});

// Test agent data structure
test('agent has required fields', () => {
  const testAgent = {
    name: '@test_agent',
    id: 'ABC123',
    identity: "👤 I'm a Human",
    status: 'NOTARIZED_ON_CHAIN',
    installedAt: new Date().toISOString()
  };
  assert.ok(testAgent.name);
  assert.ok(testAgent.id);
  assert.ok(testAgent.identity);
  assert.ok(testAgent.status);
  assert.ok(testAgent.installedAt);
});

test('agent name is properly formatted', () => {
  const name = '@test_agent';
  assert.match(name, /^@[a-zA-Z0-9_-]+$/);
});

// Test file operations
test('can create and remove directory', () => {
  const testDir = './test_data';
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });
  assert.ok(fs.existsSync(testDir));
  fs.rmSync(testDir, { recursive: true });
});
