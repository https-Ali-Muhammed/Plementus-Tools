import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const DEFAULT_TIMEOUT = 12000;
const MAX_BODY_BYTES = 2_500_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cleanHeaders(headers) {
  return Object.fromEntries(Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value || '')]));
}

/**
 * Performs a single HTTP(S) request.
 *
 * TLS metadata is captured at handshake time (on the socket's 'secureConnect'
 * event, or immediately if a pooled/reused socket is already secure) rather
 * than after the response body has finished streaming. Capturing it late can
 * observe a socket that keep-alive pooling has already recycled for another
 * request, or miss the handshake entirely on a request that errors out before
 * completion — producing impossible combinations such as "HTTPS: pass / TLS:
 * no connection" in reports. Capturing at handshake time ties the TLS record
 * to the connection that actually served this request.
 */
export function requestOnce(target, { timeout = DEFAULT_TIMEOUT, method = 'GET', rejectUnauthorized = true, maxBodyBytes = MAX_BODY_BYTES, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(target);
    const transport = parsed.protocol === 'https:' ? https : http;
    const options = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: `${parsed.pathname || '/'}${parsed.search || ''}`,
      method,
      // Disable keep-alive pooling for scan requests: this is a one-shot
      // diagnostic client, and a fresh connection per request guarantees the
      // TLS handshake we observe belongs to the request we're reporting on.
      agent: false,
      headers: {
        'User-Agent': 'Web-Engineering-Toolkit-Security-Scanner/1.4',
        'Accept': 'text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5',
        'Connection': 'close',
        ...headers
      }
    };
    if (parsed.protocol === 'https:') options.rejectUnauthorized = rejectUnauthorized;

    let tls = null;
    const captureTls = (socket) => {
      if (tls || !socket || !socket.encrypted) return;
      const cert = typeof socket.getPeerCertificate === 'function' ? socket.getPeerCertificate() : null;
      tls = {
        protocol: typeof socket.getProtocol === 'function' ? socket.getProtocol() : '',
        cipher: typeof socket.getCipher === 'function' ? socket.getCipher() : null,
        authorized: Boolean(socket.authorized),
        authorizationError: socket.authorizationError || '',
        validFrom: cert?.valid_from || '',
        validTo: cert?.valid_to || '',
        issuer: cert?.issuer?.O || cert?.issuer?.CN || '',
        subject: cert?.subject?.CN || '',
        capturedAt: 'handshake'
      };
    };

    const req = transport.request(options, (res) => {
      const chunks = [];
      let size = 0;
      let truncated = false;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size <= maxBodyBytes) chunks.push(chunk);
        else truncated = true;
      });
      res.on('end', () => {
        // Fallback only: covers a reused/pooled socket where 'secureConnect'
        // never re-fires because the TLS session was already established.
        if (!tls) captureTls(res.socket);
        const rawCookies = [];
        for (let index = 0; index < (res.rawHeaders || []).length; index += 2) {
          if (String(res.rawHeaders[index]).toLowerCase() === 'set-cookie') rawCookies.push(String(res.rawHeaders[index + 1] || ''));
        }
        resolve({
          url: target,
          status: res.statusCode || 0,
          headers: cleanHeaders(res.headers),
          setCookies: rawCookies,
          body: Buffer.concat(chunks).toString('utf8'),
          truncated,
          tls
        });
      });
    });

    req.on('socket', (socket) => {
      if (parsed.protocol !== 'https:') return;
      // Do NOT check socket.encrypted here to short-circuit capture: it is
      // true the instant a TLSSocket object is created, well before the
      // handshake completes, so reading it here previously captured an
      // empty pre-handshake certificate and an incorrect authorized:false,
      // then blocked the real capture below (captureTls no-ops once `tls`
      // is set). Connections in this client are never pooled (agent:false),
      // so 'secureConnect' is guaranteed to fire for every request.
      socket.once('secureConnect', () => captureTls(socket));
    });

    req.setTimeout(timeout, () => req.destroy(new Error(`Request timed out after ${timeout} ms.`)));
    req.on('error', reject);
    req.end();
  });
}

export async function requestWithRedirects(target, { maxRedirects = 6, retries = 1, ...options } = {}) {
  const chain = [];
  let current = target;
  for (let i = 0; i <= maxRedirects; i += 1) {
    let response;
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        response = await requestOnce(current, options);
        break;
      } catch (error) {
        lastError = error;
        if (attempt < retries) await sleep(300 * (attempt + 1));
      }
    }
    if (!response) throw lastError;
    chain.push({ url: current, status: response.status, location: response.headers.location || '' });
    if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location) {
      current = new URL(response.headers.location, current).href;
      continue;
    }
    return { ...response, finalUrl: current, redirectChain: chain };
  }
  throw new Error(`Too many redirects while requesting ${target}.`);
}
