import http from 'node:http';

const privacyVariants = {
  complete: '<h1>Privacy Policy</h1><p>You have the right to access, rectification, portability, and erasure. We retain personal data for defined retention periods. Manage cookie preferences at any time. Our subprocessors are governed by a data processing agreement.</p>',
  minimal: '<h1>Privacy</h1><p>We respect your privacy.</p>',
  template: '<h1>Privacy Policy Template</h1><p>This sample policy is provided as an example. Replace this placeholder with your company details before publication.</p>',
  placeholder: '<h1>Privacy Policy</h1><p>TODO: add controller details and legal basis here.</p>',
  empty: '',
  'rendered-only': '<main id="policy-root"></main><script>document.querySelector("#policy-root").textContent="Privacy policy rendered by the application";</script>',
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
  if (url.pathname === '/secure-corporate') {
    headers['Content-Security-Policy'] = "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
    headers['X-Frame-Options'] = 'DENY';
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()';
  }
  if (url.pathname === '/weak-security') {
    headers['Set-Cookie'] = ['session_id=SECRET_TEST_SESSION; Path=/', 'preferences=test; SameSite=None'];
    headers['Access-Control-Allow-Origin'] = '*';
  }
  if (url.pathname === '/permissive-cors') {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  if (url.pathname === '/redirect-to-http') {
    res.writeHead(302, { Location: '/http-only' });
    return res.end();
  }
  if (url.pathname === '/session') {
    const role = url.searchParams.get('role') || 'normal';
    res.writeHead(302, { 'Set-Cookie': `role=${role}; HttpOnly; SameSite=Lax`, Location: `/app/${role}` });
    return res.end();
  }

  let body = page('Security lab', '<h1>Security lab</h1>');
  if (url.pathname === '/secure-corporate') body = page('Corporate', '<h1>Corporate website</h1><a href="/privacy/complete">Privacy policy</a><a href="/terms">Terms</a><p>Company information and services.</p>');
  if (url.pathname === '/weak-security') body = page('Weak security', '<h1>Weak fixture</h1><img src="http://assets.example.invalid/logo.png"><script src="/assets/application.js"></script>');
  if (url.pathname === '/mixed-content') body = page('Mixed content', '<img src="http://assets.example.invalid/logo.png"><form action="http://api.example.invalid/submit"></form>');
  if (url.pathname === '/analytics-before-consent') body = page('Tracking before consent', '<script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script><p>Cookie preferences</p><button>Accept cookies</button>');
  if (url.pathname === '/analytics-no-consent') body = page('Tracking without consent UI', '<script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script><p>Analytics loads without a visitor choice.</p>');
  if (url.pathname === '/login') body = page('Login', '<form method="post" action="/session"><input name="username"><input name="password" type="password"><button>Sign in</button></form>');
  if (url.pathname.startsWith('/login/')) {
    const role = url.pathname.split('/').pop();
    body = page(`Login ${role}`, `<form method="post" action="/session?role=${role}"><input name="username"><input name="password" type="password"><button>Sign in</button></form>`);
  }
  if (url.pathname.startsWith('/app/')) {
    const requestedRole = url.pathname.split('/').pop();
    const granted = new RegExp(`(?:^|;\\s*)role=${requestedRole}(?:;|$)`).test(req.headers.cookie || '');
    if (!granted) {
      res.writeHead(403, headers);
      return res.end(page('Restricted', '<h1>Restricted authenticated page</h1>'));
    }
    body = page(`${requestedRole} workspace`, `<h1>${requestedRole} workspace</h1><p>Bounded role-specific fixture content. This does not validate RBAC.</p>`);
  }
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
  if (url.pathname === '/payment-generic') body = page('Payments', '<h1>Checkout</h1><p>We accept card payments.</p><script src="/assets/application.js"></script>');
  if (url.pathname === '/payment-redirect') body = page('Payments', '<h1>Checkout</h1><a href="https://checkout.stripe.com/pay/fixture">Continue to payment provider</a>');
  if (url.pathname === '/payment-iframe') body = page('Payments', '<h1>Checkout</h1><iframe title="Payment" src="https://checkout.stripe.com/frame/fixture"></iframe>');
  if (url.pathname === '/payment-hosted-fields') body = page('Payments', '<h1>Checkout</h1><script src="https://js.stripe.com/v3/elements.js"></script><div id="hosted-card-field"></div>');
  if (url.pathname === '/payment-merchant-form') body = page('Payments', '<h1>Checkout</h1><form action="/pay"><input name="card_number"><input name="cvv"><button>Pay</button></form>');
  if (url.pathname === '/payment-card') body = page('Card payment', '<h1>Cardholder data</h1><p>Our PCI DSS card data environment processes payment card data.</p>');
  if (url.pathname.startsWith('/privacy/')) body = page('Privacy', privacyVariants[url.pathname.split('/').pop()] || privacyVariants.absent);
  if (url.pathname === '/privacy-fragment') body = page('Privacy signal', '<a href="#privacy">Privacy policy</a><section id="privacy"><p>Short dynamically revealed privacy signal.</p></section>');
  if (url.pathname === '/no-policy') body = page('No policy', '<h1>Company</h1><p>No legal-document navigation is present.</p>');
  if (url.pathname === '/consent-none') body = page('No tracking', '<h1>Welcome</h1><p>No tracker and no consent banner.</p>');
  if (url.pathname === '/consent-banner') body = page('Consent', '<button>Accept cookies</button><button>Reject cookies</button><script src="https://www.googletagmanager.com/gtag/js?id=G-CONSENT"></script>');
  if (url.pathname === '/consent-policy-claim') body = page('Consent claim', '<a href="/privacy/complete">Privacy policy</a><p>Use the cookie banner to manage preferences.</p>');
  if (url.pathname === '/en' || url.pathname === '/en/') body = page('English', '<html lang="en"><link rel="alternate" hreflang="ar" href="/ar"><a href="/en/privacy">Privacy</a><a href="/ar/privacy">العربية</a></html>');
  if (url.pathname === '/ar' || url.pathname === '/ar/') body = page('Arabic', '<html lang="ar" dir="rtl"><link rel="alternate" hreflang="en" href="/en"><a href="/ar/privacy">الخصوصية</a><a href="/en/privacy">English</a></html>');
  if (url.pathname === '/en/privacy') body = page('Privacy', '<html lang="en"><p>You may access and erase personal data. We retain records for 90 days and use processors.</p></html>');
  if (url.pathname === '/ar/privacy') body = page('الخصوصية', '<html lang="ar" dir="rtl"><p>لديك الحق في الوصول إلى بياناتك ومحوها. نحتفظ بالبيانات لمدة 90 يوماً ونستخدم معالجي البيانات. يمكنك سحب موافقتك.</p></html>');
  if (url.pathname === '/html-lang-only') body = '<!doctype html><html lang="en-US"><head><title>Language metadata</title></head><body><p>One route only.</p></body></html>';
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
