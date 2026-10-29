// Synthetic scheduler: serial transactions, staged writes, request callbacks and rollback.
export function fakeIndexedDB() {
  let data = new Map(), tail = Promise.resolve(), abortNext = false, failOpen = false, beforeTransaction;
  let abortAfterDeletes = 0, failNextDelete = false, transactions = 0, startedTransactions = 0, holdCommit;
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const factory = {
    failOpen() { failOpen = true; },
    abortNext() { abortNext = true; },
    abortAfterDeletes(count) { abortAfterDeletes = count; },
    failNextDelete() { failNextDelete = true; },
    pauseNextCommit() {
      let release;
      holdCommit = new Promise(resolve => { release = resolve; });
      return release;
    },
    transactionCount() { return transactions; },
    startedTransactionCount() { return startedTransactions; },
    beforeTransaction(fn) { beforeTransaction = fn; },
    seed(value, key = value.runId) { data.set(key, clone(value)); },
    snapshot(id) { return clone(data.get(id)); },
    open() {
      const request = {};
      queueMicrotask(() => {
        if (failOpen) { request.onerror?.(); return; }
        request.result = {
          createObjectStore() {},
          transaction() {
            transactions++;
            const tx = { oncomplete: null, onabort: null, onerror: null };
            let aborted = false, started = false, pending = 0, staged;
            const operations = [];
            tx.abort = () => { aborted = true; };
            const schedule = action => {
              const request = {};
              const run = () => {
                if (aborted) return;
                try { action(request); request.onsuccess?.(); }
                catch { aborted = true; request.onerror?.(); }
              };
              if (started) { pending++; queueMicrotask(() => { run(); pending--; }); }
              else operations.push(run);
              return request;
            };
            tx.objectStore = () => ({
              get: id => schedule(req => { req.result = clone(staged.get(id)); }),
              add: value => schedule(() => { if (staged.has(value.runId)) throw Error(); staged.set(value.runId, clone(value)); }),
              put: value => schedule(() => { staged.set(value.runId, clone(value)); }),
              delete: id => schedule(() => {
                if (failNextDelete) { failNextDelete = false; throw Error(); }
                staged.delete(id);
                if (abortAfterDeletes && --abortAfterDeletes === 0) aborted = true;
              }),
              openCursor: () => {
                let entries, index = 0, request;
                const advance = req => {
                  if (!entries) entries = [...staged.entries()];
                  if (index >= entries.length) { req.result = null; return; }
                  const [key, value] = entries[index++];
                  req.result = { primaryKey: key, value: clone(value), delete: () => schedule(() => {
                    if (failNextDelete) { failNextDelete = false; throw Error(); }
                    staged.delete(key);
                    if (abortAfterDeletes && --abortAfterDeletes === 0) aborted = true;
                  }), continue() { pending++; queueMicrotask(() => { if (!aborted) { advance(request); request.onsuccess?.(); } pending--; }); } };
                };
                request = schedule(advance); return request;
              },
            });
            tail = tail.then(async () => {
              if (beforeTransaction) { const hook = beforeTransaction; beforeTransaction = undefined; hook(); }
              staged = new Map([...data].map(([k, v]) => [k, clone(v)]));
              started = true;
              startedTransactions++;
              for (const operation of operations) operation();
              while (pending) await new Promise(resolve => setImmediate(resolve));
              if (holdCommit) { const held = holdCommit; holdCommit = undefined; await held; }
              if (abortNext) { abortNext = false; aborted = true; }
              if (aborted) tx.onabort?.();
              else { data = staged; tx.oncomplete?.(); }
            });
            return tx;
          },
        };
        request.onupgradeneeded?.(); request.onsuccess?.();
      });
      return request;
    },
  };
  return factory;
}
