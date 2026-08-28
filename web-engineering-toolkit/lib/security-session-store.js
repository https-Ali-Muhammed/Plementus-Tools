import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, slugify } from './utils.js';

function deriveKey(value) {
  return crypto.createHash('sha256').update(value).digest();
}

export class SecuritySessionStore {
  constructor({ root, encryptionSecret = process.env.SECURITY_SESSION_KEY || '' }) {
    this.root = ensureDir(root);
    this.persistentKey = Boolean(encryptionSecret);
    this.key = encryptionSecret ? deriveKey(encryptionSecret) : crypto.randomBytes(32);
  }

  sessionId(projectName, role = 'user') {
    return `${slugify(projectName)}__${slugify(role || 'user')}`;
  }

  fileFor(id) {
    return path.join(this.root, `${slugify(id)}.session.enc.json`);
  }

  save(id, storageState) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const plaintext = Buffer.from(JSON.stringify(storageState), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const payload = {
      version: 1,
      algorithm: 'aes-256-gcm',
      createdAt: new Date().toISOString(),
      persistentAcrossRestarts: this.persistentKey,
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      ciphertext: encrypted.toString('base64')
    };
    fs.writeFileSync(this.fileFor(id), `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
    return { id, createdAt: payload.createdAt, persistentAcrossRestarts: this.persistentKey };
  }

  load(id) {
    const file = this.fileFor(id);
    if (!fs.existsSync(file)) return null;
    try {
      const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(payload.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
      const plaintext = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]);
      return { storageState: JSON.parse(plaintext.toString('utf8')), metadata: { id, createdAt: payload.createdAt, persistentAcrossRestarts: Boolean(payload.persistentAcrossRestarts) } };
    } catch {
      return null;
    }
  }
}
