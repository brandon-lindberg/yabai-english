/** Small owner-scoped LRU for immutable values. Concurrent callers share an in-flight load. */
export function createBoundedAsyncCache<Value>(capacity: number) {
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error("Cache capacity must be positive");
  const owners = new WeakMap<object, Map<string, Promise<Value>>>();
  return (owner: object, key: string, load: () => Promise<Value>): Promise<Value> => {
    let entries = owners.get(owner);
    if (!entries) { entries = new Map(); owners.set(owner, entries); }
    const existing = entries.get(key);
    if (existing) { entries.delete(key); entries.set(key, existing); return existing; }
    const pending = Promise.resolve().then(load).catch(error => {
      if (entries.get(key) === pending) entries.delete(key);
      throw error;
    });
    entries.set(key, pending);
    if (entries.size > capacity) entries.delete(entries.keys().next().value!);
    return pending;
  };
}
