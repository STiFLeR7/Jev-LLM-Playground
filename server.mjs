import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { evaluateTicket, requestBody, baseline } from './playground.mjs';

export function createPlaygroundServer({ apiKey = process.env.TYPESAFE_API_KEY || process.env.JEV_LLM_API, evaluate = evaluateTicket } = {}) {
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
      if (req.method !== 'POST' || req.url !== '/api/triage') return send(404, { error: 'Not found.' });
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') return send(415, { error: 'JSON required.' });
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 128000) return send(413, { error: 'Request too large.' });
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'Invalid JSON.' }); }
      if (!input || typeof input.live !== 'boolean' || typeof input.threshold !== 'number' || !Number.isFinite(input.threshold) || input.threshold < 0 || input.threshold > 1) return send(400, { error: 'Provide live mode and a threshold between 0 and 1.' });
      let request;
      try { request = requestBody(input.text); } catch (error) { return send(400, { error: error.message }); }
      if (!input.live) return send(200, { mode: 'request_preview', api_calls: 0, baseline: baseline(input.text), request });
      if (!apiKey || apiKey === 'replace_with_your_typesafe_key') return send(503, { error: 'Set TYPESAFE_API_KEY or JEV_LLM_API in .env and restart.' });
      if (busy) return send(429, { error: 'A live request is already running. Please wait.' });
      // ponytail: one live request at a time; add per-user limits only if this becomes a hosted service.
      busy = true;
      try { send(200, { mode: 'live', ...await evaluate(input.text, { apiKey, threshold: input.threshold }) }); }
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
