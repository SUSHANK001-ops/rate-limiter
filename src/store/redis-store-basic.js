
const Redis = require('ioredis');

class RedisStore {
  constructor({ client, keyPrefix = 'rl:' }) {
    if (!client) {
      throw new Error('Redis client is required');
    }
    this.client = client;
    this.keyPrefix = keyPrefix; // all your keys look like "rl:192.168.1.1"
  }

  _key(key) {
    return `${this.keyPrefix}${key}`; // namespaces your keys in Redis
  }

  async get(key) {
    const data = await this.client.get(this._key(key));
    if (!data) return null;
    return JSON.parse(data);
  }

  async set(key, value, windowMs) {
    const serialized = JSON.stringify(value);
    const ttlSeconds = Math.ceil(windowMs / 1000);
    // EX = expire in seconds — Redis auto-deletes after TTL
    await this.client.set(this._key(key), serialized, 'EX', ttlSeconds);
  }

  async delete(key) {
    await this.client.del(this._key(key));
  }

  async cleanup() {
    // Redis handles cleanup automatically via TTL
    // this method exists to match MemoryStore interface
    return;
  }
}

module.exports = RedisStore;