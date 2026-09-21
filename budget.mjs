import { openSync, closeSync, readFileSync, writeFileSync, fsyncSync, unlinkSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

// Official model limits/pricing verified 2026-09-21: https://docs.typesafe.ai/models
// Reserve 65,536 rather than interpreting the documented 64k as 64,000.
export const pricing = Object.freeze({ model: 'jev-1.13.0', max_input_tokens: 65536,
  input_nanodollars_per_token: 42, output_nanodollars_per_token: 0, checked_at: '2026-09-21',
  source: 'https://docs.typesafe.ai/models' });
const reservation = pricing.max_input_tokens * pricing.input_nanodollars_per_token;
const check = (ok, message = 'Invalid budget ledger.') => { if (!ok) throw new Error(message); };

export async function openBudget(path, limitUsd) {
  check(typeof limitUsd === 'string' && /^\d+(?:\.\d{1,9})?$/.test(limitUsd), 'Invalid budget limit.');
  const [whole, fraction = ''] = limitUsd.split('.');
  const limitBig = BigInt(whole) * 1000000000n + BigInt(fraction.padEnd(9, '0'));
  check(limitBig > 0n && limitBig <= 50000000n, 'Budget limit must be greater than zero and at most USD 0.05.');
  const limit = Number(limitBig);
  let lock;
  try { lock = openSync(path + '.lock', 'wx', 0o600); }
  catch { throw new Error('Budget lock unavailable; inspect any existing lock before retrying.'); }
  let file, closed = false, poisoned = false, sequence = 0, observed = 0;
  const pending = new Set();
  const close = async () => {
    if (closed) return;
    closed = true;
    try { if (file !== undefined) closeSync(file); }
    finally { closeSync(lock); unlinkSync(path + '.lock'); }
  };
  const header = { type: 'budget', schema_version: 1, limit_nanodollars: limit, pricing };
  const snapshot = () => ({ limit_nanodollars: limit, observed_nanodollars: observed,
    held_nanodollars: pending.size * reservation, accounted_nanodollars: observed + pending.size * reservation,
    requests_reserved: sequence, unsettled_requests: pending.size });
  const apply = entry => {
    check(entry && Number.isSafeInteger(entry.id));
    if (entry.type === 'reserve') {
      check(isDeepStrictEqual(Object.keys(entry).sort(), ['id', 'type']) && entry.id === sequence + 1);
      check(snapshot().accounted_nanodollars + reservation <= limit, 'Budget exhausted; no request sent.');
      sequence = entry.id; pending.add(entry.id);
    } else {
      check(entry.type === 'settle' && isDeepStrictEqual(Object.keys(entry).sort(), ['id', 'input_tokens', 'type']));
      check(pending.has(entry.id) && Number.isSafeInteger(entry.input_tokens) && entry.input_tokens >= 0 && entry.input_tokens <= pricing.max_input_tokens);
      pending.delete(entry.id); observed += entry.input_tokens * pricing.input_nanodollars_per_token;
    }
  };
  const append = entry => {
    check(!closed && !poisoned, 'Budget ledger is closed or unavailable.');
    const previous = { sequence, observed, pending: [...pending] };
    apply(entry);
    try { writeFileSync(file, JSON.stringify(entry) + '\n'); fsyncSync(file); }
    catch {
      sequence = previous.sequence; observed = previous.observed;
      pending.clear(); for (const id of previous.pending) pending.add(id);
      poisoned = true; throw new Error('Cannot persist budget reservation; stop all paid requests.');
    }
  };
  try {
    let created = false;
    try { file = openSync(path, 'wx+', 0o600); created = true; }
    catch (error) { if (error.code !== 'EEXIST') throw error; file = openSync(path, 'a+', 0o600); }
    if (created) { writeFileSync(file, JSON.stringify(header) + '\n'); fsyncSync(file); }
    else {
      const text = readFileSync(path, 'utf8');
      check(text.endsWith('\n') && text.length <= 2e6);
      let entries;
      try { entries = text.trimEnd().split('\n').map(line => JSON.parse(line)); }
      catch { throw new Error('Invalid budget ledger.'); }
      check(entries[0]?.limit_nanodollars === limit, 'Existing ledger budget limit differs; do not reset it.');
      check(isDeepStrictEqual(entries[0], header));
      for (const entry of entries.slice(1)) apply(entry);
    }
    return { snapshot,
      reserve: async () => { const id = sequence + 1; append({ type: 'reserve', id }); return id; },
      settle: async (id, inputTokens) => append({ type: 'settle', id, input_tokens: inputTokens }),
      close };
  } catch (error) { await close(); throw error; }
}
