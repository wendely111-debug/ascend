// IndexedDB mínimo (chave → Blob) para guardar as fotos de prova no modo solo.
const DB = 'ascend-evidence';
const STORE = 'blobs';
let dbp = null;

function open() {
  return (dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export const idbPut = (key, blob) => tx('readwrite', (s) => s.put(blob, key));
export const idbGet = (key) => tx('readonly', (s) => s.get(key));
export const idbClear = () => tx('readwrite', (s) => s.clear());
