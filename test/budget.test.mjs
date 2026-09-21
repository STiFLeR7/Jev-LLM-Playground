import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
const budgetModule = await import('../budget.mjs').catch(e => { if (e.code === 'ERR_MODULE_NOT_FOUND') return {}; throw e; });

async function location(t) {
  const dir = await mkdtemp(join(tmpdir(), 'jev-budget-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  assert.equal(typeof budgetModule.openBudget, 'function', 'durable budget guard must exist');
  return join(dir, 'spend.jsonl');
}

test('reserve full request cost before dispatch; exact boundary blocks the next call', async t => {
  const path = await location(t);
  const budget = await budgetModule.openBudget(path, '0.002752512');
  try {
    const id = await budget.reserve();
    assert.equal(budget.snapshot().accounted_nanodollars, 2752512);
    assert.ok((await readFile(path, 'utf8')).includes('reserve'));
    await assert.rejects(budget.reserve(), /budget/i);
    await budget.settle(id, 500);
    assert.equal(budget.snapshot().observed_nanodollars, 21000);
    assert.equal(budget.snapshot().held_nanodollars, 0);
    await assert.rejects(budget.reserve(), /budget/i);
    await assert.rejects(budget.settle(id, 500));
  } finally { await budget.close(); }
});

test('reopen retains unreported reservations and settlements; concurrent access is denied', async t => {
  const path = await location(t);
  const first = await budgetModule.openBudget(path, '0.05');
  await assert.rejects(budgetModule.openBudget(path, '0.05'), /lock/i);
  await first.settle(await first.reserve(), 1000);
  await first.reserve(); // simulated request failure or crash: no settlement
  await first.close();
  const reopened = await budgetModule.openBudget(path, '0.05');
  try {
    assert.equal(reopened.snapshot().accounted_nanodollars, 2794512);
    assert.equal(reopened.snapshot().observed_nanodollars, 42000);
    assert.equal(reopened.snapshot().held_nanodollars, 2752512);
  } finally { await reopened.close(); }
  await assert.rejects(budgetModule.openBudget(path, '0.04'), /limit/i);
});

test('invalid amounts, excessive usage, and corrupt ledger fail closed', async t => {
  const path = await location(t);
  for (const value of ['0', '-1', '0.050000001', 'NaN', '0.0000000001', '1e-3']) {
    await assert.rejects(budgetModule.openBudget(path, value));
  }
  const budget = await budgetModule.openBudget(path, '0.05');
  const id = await budget.reserve();
  for (const tokens of [-1, 0.5, NaN, 65537]) await assert.rejects(budget.settle(id, tokens));
  assert.equal(budget.snapshot().held_nanodollars, 2752512);
  await budget.close();
  await appendFile(path, '{broken');
  await assert.rejects(budgetModule.openBudget(path, '0.05'), /ledger/i);
});

test('ledger rejects unknown or duplicate settlements rather than lowering spend', async t => {
  const path = await location(t);
  const budget = await budgetModule.openBudget(path, '0.05');
  const id = await budget.reserve();
  await budget.settle(id, 500);
  await budget.close();
  await appendFile(path, JSON.stringify({ type: 'settle', id, input_tokens: 0 }) + '\n');
  await assert.rejects(budgetModule.openBudget(path, '0.05'), /ledger/i);
});

test('failed settlement persistence retains conservative reservation and disables further calls', async t => {
  const path = await location(t);
  const budget = await budgetModule.openBudget(path, '0.05');
  const id = await budget.reserve();
  const mocked = t.mock.method(fs, 'fsyncSync', () => { throw Error('simulated disk failure'); });
  syncBuiltinESMExports();
  try {
    await assert.rejects(budget.settle(id, 500), /persist/i);
    assert.equal(budget.snapshot().held_nanodollars, 2752512);
    await assert.rejects(budget.reserve(), /unavailable/i);
  } finally { mocked.mock.restore(); syncBuiltinESMExports(); await budget.close(); }
});
