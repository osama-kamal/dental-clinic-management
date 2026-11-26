// Keeps the database file in this browser's IndexedDB so each visitor has a private copy.
const DB = 'dental-demo';
const STORE = 'files';

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export async function loadFile(key: string): Promise<Uint8Array | null> {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const r = db.transaction(STORE).objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result ? new Uint8Array(r.result) : null);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}

let timer: number | undefined;
export function saveFileDebounced(key: string, data: Uint8Array): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    try {
      const db = await open();
      db.transaction(STORE, 'readwrite').objectStore(STORE).put(data, key);
    } catch (e) {
      console.warn('Could not save demo data in this browser', e);
    }
  }, 300);
}

export async function clearAll(): Promise<void> {
  const db = await open();
  db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
}
