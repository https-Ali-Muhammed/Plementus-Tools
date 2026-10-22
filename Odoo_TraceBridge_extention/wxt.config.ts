import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Odoo TraceBridge',
    description: 'Local-first Odoo troubleshooting handover (consent preview; recording unavailable).',
    minimum_chrome_version: '120',
    permissions: ['activeTab'],
    incognito: 'not_allowed',
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'",
    },
    action: {
      default_title: 'Odoo TraceBridge',
    },
  },
});
