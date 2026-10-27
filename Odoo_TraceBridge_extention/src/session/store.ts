import { checkBounds, type Header } from './model';

export interface HeaderStore { update(change: (rows: unknown[]) => Header[]): Promise<Header[]> }

export function createHeaderStore(): HeaderStore {
  let connection: Promise<IDBDatabase> | undefined;
  function open() {
    return connection ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('tracebridge', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('cases', { keyPath: 'id' });
      request.onerror = () => reject(new Error('Case storage unavailable.'));
      request.onblocked = () => reject(new Error('Case storage blocked.'));
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    });
  }
  return {
    async update(change) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('cases', 'readwrite', { durability: 'strict' });
        const store = tx.objectStore('cases');
        let next: Header[];
        const request = store.getAll();
        request.onsuccess = () => {
          try {
            next = change(request.result);
            checkBounds(next);
            // One atomic replacement: a terminated/aborted transaction cannot leave half a delete.
            store.clear();
            for (const row of next) store.put(row);
          } catch { tx.abort(); }
        };
        tx.oncomplete = () => resolve(next);
        tx.onabort = tx.onerror = () => reject(new Error('Case transaction failed.'));
      });
    },
  };
}
