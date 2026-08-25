import http from 'node:http';

const privacyVariants = {
  complete: '<h1>Privacy Policy</h1><p>You have the right to access, rectification, portability, and erasure. We retain personal data for defined retention periods. Manage cookie preferences at any time. Our subprocessors are governed by a data processing agreement.</p>',
  minimal: '<h1>Privacy</h1><p>We respect your privacy.</p>',
  absent: '<h1>About</h1><p>No privacy notice is published here.</p>'
};

function page(title, body, extraHead = '') {
  return `<!doctype html><html><head><title>${title}</title>${extraHead}</head><body>${body}</body></html>`;
}

function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const headers = { 'Content-Type': 'text/html; charset=utf-8' };
  if (url.pathname === '/weak-csp') {
    headers['Content-Security-Policy'] = "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'";
  }
  if (url.pathname === '/weak-cookies') {
    headers['Set-Cookie'] = ['session_id=test-secret; HttpOnly; SameSite=Lax', '_ga=tracking-secret; Path=/'];
  }
  if (url.pathname === '/permissive-cors') {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  if (url.pathname === '/redirect-to-http') {
    res.writeHead(302, { Location: '/http-only' });
    return res.end();
  }

  let body = page('Security lab', '<h1>Security lab</h1>');
  if (url.pathname === '/mixed-content') body = page('Mixed content', '<img src="http://assets.example.invalid/logo.png"><form action="http://api.example.invalid/submit"></form>');
  if (url.pathname === '/analytics-before-consent') body = page('Tracking before consent', '<script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script><p>Cookie preferences</p><button>Accept cookies</button>');
  if (url.pathname === '/analytics-no-consent') body = page('Tracking without consent UI', '<script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script><p>Analytics loads without a visitor choice.</p>');
  if (url.pathname === '/login') body = page('Login', '<form method="post" action="/session"><input name="username"><input name="password" type="password"><button>Sign in</button></form>');
  if (url.pathname === '/dashboard') body = page('Dashboard', '<nav><a href="/account">Account</a><a href="/admin">Admin</a></nav><h1>User dashboard</h1>');
  if (url.pathname === '/admin') {
    if (!/role=admin/.test(req.headers.cookie || '')) {
      res.writeHead(403, headers);
      return res.end(page('Forbidden', '<h1>Forbidden</h1>'));
    }
    body = page('Admin', '<h1>Administration</h1><a href="/api/users/1001">User 1001</a>');
  }
  if (url.pathname === '/healthcare') body = page('Industries', '<h1>Industries</h1><p>We build websites for healthcare and wellness companies.</p>');
  if (url.pathname === '/healthcare-phi') body = page('Patient portal', '<h1>Patient portal</h1><p>This service handles protected health information (PHI) under a business associate agreement.</p>');
  if (url.pathname === '/payment') body = page('Payments', '<h1>Billing</h1><p>Payments are redirected to an external provider.</p>');
  if (url.pathname === '/payment-card') body = page('Card payment', '<h1>Cardholder data</h1><p>Our PCI DSS card data environment processes payment card data.</p>');
  if (url.pathname.startsWith('/privacy/')) body = page('Privacy', privacyVariants[url.pathname.split('/').pop()] || privacyVariants.absent);
  if (url.pathname === '/fake-compliance') body = page('Compliance', '<h1>Compliance</h1><p>We are GDPR compliant, HIPAA certified, SOC 2 approved, and ISO 27001 ready.</p>');

  res.writeHead(200, headers);
  res.end(body);
}

export async function startSecurityLab() {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}
