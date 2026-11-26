// Minimal in-memory 'fs' for the browser demo. The database file is persisted to
// IndexedDB by persistence.ts; log files are dropped.
import { Buffer } from 'buffer';

const files = new Map<string, Uint8Array>();
type Listener = (path: string, data: Uint8Array) => void;
let onWrite: Listener | null = null;

export const __setWriteListener = (l: Listener) => { onWrite = l; };
export const __preload = (path: string, data: Uint8Array) => { files.set(path, data); };

const isLog = (p: string) => p.endsWith('.log');

const fs = {
  existsSync: (p: string) => files.has(p) || p === '/demo' || p === '/demo/backups' || p === '/demo/logs',
  mkdirSync: () => undefined,
  readFileSync: (p: string) => {
    const d = files.get(p);
    if (!d) throw new Error(`ENOENT: ${p}`);
    return Buffer.from(d);
  },
  writeFileSync: (p: string, data: any) => {
    if (isLog(p)) return;
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
    files.set(p, bytes);
    onWrite?.(p, bytes);
  },
  appendFileSync: (_p: string, _d: any) => undefined,
  unlinkSync: (p: string) => { files.delete(p); },
  readdirSync: (_p: string) => [] as string[],
  statSync: (p: string) => ({ size: files.get(p)?.length ?? 0, mtime: new Date(), isFile: () => true }),
  copyFileSync: (a: string, b: string) => { const d = files.get(a); if (d) files.set(b, d); },
};
export default fs;
export const { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, unlinkSync, readdirSync, statSync, copyFileSync } = fs;
