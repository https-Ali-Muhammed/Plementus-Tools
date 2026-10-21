import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Odoo TraceBridge',
    description: 'Local-first Odoo troubleshooting handover (scaffold only).',
    minimum_chrome_version: '120',
    action: {
      default_title: 'Odoo TraceBridge',
    },
  },
});
