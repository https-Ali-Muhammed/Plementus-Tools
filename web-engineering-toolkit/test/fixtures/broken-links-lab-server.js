import http from 'node:http';

function html(title, body, head = '') {
  return `<!doctype html><html><head><title>${title}</title>${head}</head><body>${body}</body></html>`;
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address()));
  });
}

export async function startBrokenLinksLab() {
  const requests = new Map();
  const count = (req) => {
    const key = `${req.method} ${new URL(req.url, `http://${req.headers.host}`).pathname}${new URL(req.url, `http://${req.headers.host}`).search}`;
    requests.set(key, (requests.get(key) || 0) + 1);
  };

  const externalServer = http.createServer((req, res) => {
    count(req);
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/external-ok') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(req.method === 'HEAD' ? '' : 'external fixture');
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end(req.method === 'HEAD' ? '' : 'external missing');
  });
  const externalAddress = await listen(externalServer);
  const externalUrl = `http://127.0.0.1:${externalAddress.port}`;

  const mainServer = http.createServer((req, res) => {
    count(req);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sendHtml = (body) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(req.method === 'HEAD' ? '' : body);
    };
    if (url.pathname === '/') return sendHtml(html('Links fixture', `
      <h1 id="top">Links fixture</h1>
      <a href="/page-two">Second page</a>
      <a href="/healthy">Healthy</a>
      <a href="/redirect-one">Redirect</a>
      <a href="/missing">Missing</a>
      <a href="/gone">Gone</a>
      <a href="/restricted">Restricted</a>
      <a href="/forbidden">Forbidden</a>
      <a href="/rate-limited">Rate limited</a>
      <a href="/server-error">Server error</a>
      <a href="/head-unsupported">HEAD fallback</a>
      <a href="/slow">Slow target</a>
      <a href="#top">Valid same-page fragment</a>
      <a href="#missing-anchor">Missing same-page fragment</a>
      <a href="/page-two#team">Valid target fragment</a>
      <a href="/page-two#absent">Missing target fragment</a>
      <a href="/query?id=1">Query one</a>
      <a href="/query?id=2">Query two</a>
      <a href="/secret?token=SECRET_TOKEN&view=public">Sensitive query</a>
      <a href="${externalUrl}/external-ok">External fixture</a>
      <a href="mailto:test@example.test">Email</a>
      <a href="/logout">Unsafe logout</a>
      <a href="http://169.254.169.254/latest/meta-data/">Metadata target</a>
      <img src="/assets/missing-image.png" alt="Missing">
      <iframe src="/missing-frame"></iframe>
      <video poster="/assets/missing-poster.jpg"></video>
      <script src="/assets/missing-script.js"></script>
      <script>setTimeout(()=>{const a=document.createElement('a');a.href='/dynamic-link';a.textContent='Dynamic link';document.body.append(a)},20)</script>
    `, '<link rel="stylesheet" href="/assets/missing.css"><link rel="manifest" href="/manifest.webmanifest">'));
    if (url.pathname === '/page-two') return sendHtml(html('Page two', '<h1>Page two</h1><a href="/healthy">Healthy duplicate</a><a href="/missing">Missing duplicate</a><a href="/">Home</a><a name="team"></a><section id="details">Details</section>'));
    if (['/healthy', '/dynamic-link', '/query', '/secret', '/manifest.webmanifest'].includes(url.pathname)) {
      res.writeHead(200, { 'Content-Type': url.pathname === '/manifest.webmanifest' ? 'application/manifest+json' : 'text/html; charset=utf-8' });
      return res.end(req.method === 'HEAD' ? '' : (url.pathname === '/manifest.webmanifest' ? '{}' : html('Healthy', '<h1>Healthy</h1>')));
    }
    if (url.pathname === '/redirect-one') { res.writeHead(301, { Location: '/redirect-two' }); return res.end(); }
    if (url.pathname === '/redirect-two') { res.writeHead(302, { Location: '/healthy' }); return res.end(); }
    if (url.pathname === '/missing' || url.pathname.startsWith('/assets/') || url.pathname === '/missing-frame') { res.writeHead(404); return res.end(); }
    if (url.pathname === '/gone') { res.writeHead(410); return res.end(); }
    if (url.pathname === '/restricted') { res.writeHead(401); return res.end(); }
    if (url.pathname === '/forbidden') { res.writeHead(403); return res.end(); }
    if (url.pathname === '/rate-limited') { res.writeHead(429, { 'Retry-After': '1' }); return res.end(); }
    if (url.pathname === '/server-error') { res.writeHead(500); return res.end(); }
    if (url.pathname === '/head-unsupported' && req.method === 'HEAD') { res.writeHead(405, { Allow: 'GET' }); return res.end(); }
    if (url.pathname === '/head-unsupported') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('GET fallback worked'); }
    if (url.pathname === '/slow') return setTimeout(() => { res.writeHead(200); res.end('slow'); }, 350);
    if (url.pathname === '/logout') { res.writeHead(200); return res.end('must not be requested'); }
    res.writeHead(404);
    return res.end();
  });
  const mainAddress = await listen(mainServer);
  const baseUrl = `http://127.0.0.1:${mainAddress.port}`;

  return {
    baseUrl,
    externalUrl,
    requests,
    requestCount(method, path) { return requests.get(`${method} ${path}`) || 0; },
    close: async () => {
      await Promise.all([
        new Promise((resolve, reject) => mainServer.close((error) => error ? reject(error) : resolve())),
        new Promise((resolve, reject) => externalServer.close((error) => error ? reject(error) : resolve()))
      ]);
    }
  };
}
