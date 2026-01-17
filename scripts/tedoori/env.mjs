import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export function loadEnv() {
  const cwd = process.cwd();
  const candidates = ['.env.local', '.env'];
  for (const file of candidates) {
    const p = path.join(cwd, file);
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: false });
    }
  }
}

