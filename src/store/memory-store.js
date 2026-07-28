class MemoryStore {
  constructor() {
    this.store = new Map();
  }

  // get a client's current record
  get(key) {
    return this.store.get(key) || null;
  }

  // create or update a client's record
  set(key, value) {
    this.store.set(key, value);
  }

  // delete one client
  delete(key) {
    this.store.delete(key);
  }

  // check if client exists
  has(key) {
    return this.store.has(key);
  }

  // delete all expired entries
  cleanup(windowMs, now = Date.now()) {
    for (const [key, value] of this.store) {
      if (now - value.windowStart >= windowMs) {
        this.store.delete(key);
      }
    }
  }

  // wipe everything — useful for testing
  clear() {
    this.store.clear();
  }

  // how many clients are currently tracked
  size() {
    return this.store.size;
  }
}

module.exports = MemoryStore;