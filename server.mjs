import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { evaluateTicket, requestBody, baseline, decisionTrace, validateResponse, questions } from './playground.mjs';
import { recordedReportView } from './evaluation.mjs';
import { evidenceFiles, evidenceView } from './evidence.mjs';
import { runAgent } from './agent.mjs';

const loadRecordedReport = async (id = 'legacy') => JSON.parse(await readFile(new URL(`./doc/results/${evidenceFiles[id]}`, import.meta.url), 'utf8'));

export function createPlaygroundServer({ apiKey = process.env.TYPESAFE_API_KEY || process.env.JEV_LLM_API, nimKey = process.env.NVIDIA_NIM_API_KEY, fetchImpl = fetch, evaluate = evaluateTicket, readReport = loadRecordedReport } = {}) {
  let busy = false;
  const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    const host = `127.0.0.1:${req.socket.localPort}`;
    if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== `http://${host}`)) return send(403, { error: 'Local same-origin requests only.' });
    try {
      if (req.method === 'GET' && Object.hasOwn(assets, req.url)) {
        const [file, type] = assets[req.url];
        const body = await readFile(new URL(`./web/${file}`, import.meta.url));
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); return res.end(body);
      }
      if (req.method === 'GET' && req.url === '/api/status') return send(200, { configured: Boolean(apiKey && apiKey !== 'replace_with_your_typesafe_key') });
      if (req.method === 'GET' && req.url.startsWith('/api/evidence/')) {
        const url = new URL(req.url, 'http://localhost');
        const id = url.pathname.slice('/api/evidence/'.length);
        if (!Object.hasOwn(evidenceFiles, id)) return send(404, { error: 'Not found.' });
        if ([...url.searchParams.keys()].some(k => k !== 'threshold')) return send(404, { error: 'Not found.' });
        const values = url.searchParams.getAll('threshold');
        const threshold = values.length ? Number(values[0]) : undefined;
        if (values.length > 1 || (values.length && (!/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(values[0]) || !Number.isFinite(threshold)))) {
          return send(400, { error: 'Provide a threshold between 0 and 1.' });
        }
        try { return send(200, evidenceView(await readReport(id), id, threshold)); }
        catch { return send(503, { error: 'Recorded report unavailable.' }); }
      }
      if (req.method === 'GET' && req.url === '/api/reports/support-routing-2026-09-21') {
        try { return send(200, recordedReportView(await readReport())); }
        catch { return send(503, { error: 'Recorded report unavailable.' }); }
      }
      if (req.method !== 'POST' || !['/api/triage', '/api/key', '/api/agent'].includes(req.url)) return send(404, { error: 'Not found.' });
      if (req.url === '/api/key' && req.headers.origin !== `http://${host}`) return send(403, { error: 'Local same-origin requests only.' });
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') return send(415, { error: 'JSON required.' });
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 128000) return send(413, { error: 'Request too large.' });
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'Invalid JSON.' }); }
      if (req.url === '/api/agent') {
        if (!['preview','baseline'].includes(input?.mode)) return send(400, {error:'Agent Lab supports offline preview and baseline only. Use the budgeted CLI for live Jev.'});
        if (input.nim && req.headers.origin !== `http://${host}`) return send(403, {error:'Local same-origin requests only.'});
        if (busy) return send(429, {error:'A request is already running. Please wait.'});
        busy=true;
        try { return send(200, await runAgent(input,{nimKey,fetchImpl})); }
        catch { return send(400, {error:'Invalid agent task or options. Use 1–4,000 characters and the documented controls.'}); }
        finally {busy=false;}
      }
      if (req.url === '/api/key') {
        if (!input || Array.isArray(input) || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'apiKey') || (input.apiKey !== null && (typeof input.apiKey !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(input.apiKey) || input.apiKey === 'replace_with_your_typesafe_key'))) return send(400, { error: 'Enter a key without spaces, up to 4096 characters.' });
        if (busy) return send(409, { error: 'Wait for the running live request before changing the key.' });
        apiKey = input.apiKey || '';
        return send(200, { configured: Boolean(apiKey) });
      }
      if (!input || typeof input.live !== 'boolean' || typeof input.threshold !== 'number' || !Number.isFinite(input.threshold) || input.threshold < 0 || input.threshold > 1) return send(400, { error: 'Provide live mode and a threshold between 0 and 1.' });
      let request;
      try { request = requestBody(input.text); } catch (error) { return send(400, { error: error.message }); }
      if (!input.live) return send(200, { mode: 'request_preview', api_calls: 0, baseline: baseline(input.text), request });
      if (!apiKey || apiKey === 'replace_with_your_typesafe_key') return send(503, { error: 'Add an API key in the Playground, or configure .env and restart.' });
      if (busy) return send(429, { error: 'A live request is already running. Please wait.' });
      // ponytail: one live request at a time; add per-user limits only if this becomes a hosted service.
      busy = true;
      try {
        const result = await evaluate(input.text, { apiKey, threshold: input.threshold });
        const clean = validateResponse(result);
        if (typeof result.latency_ms !== 'number' || !Number.isFinite(result.latency_ms) || result.latency_ms < 0) throw new Error('Invalid latency.');
        const trace = decisionTrace(clean, input.threshold);
        send(200, {
          mode: 'live', model: clean.model, answers: clean.answers, usage: clean.usage,
          latency_ms: result.latency_ms, decision: trace.decision, trace, questions,
        });
      }
      catch { send(502, { error: 'Provider request failed or returned an invalid response. No decision was made.' }); }
      finally { busy = false; }
    } catch { if (!res.headersSent) send(500, { error: 'Local server error.' }); else res.end(); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createPlaygroundServer();
  server.requestTimeout = 35000;
  server.on('error', () => { console.error('Cannot start playground on 127.0.0.1:3000. Check whether the port is in use.'); process.exitCode = 1; });
  server.listen(3000, '127.0.0.1', () => console.log('Jev playground: http://127.0.0.1:3000 — Ctrl+C to stop'));
}
