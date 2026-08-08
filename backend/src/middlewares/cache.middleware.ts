// ============================================================
// VIREON — IN-MEMORY LRU API CACHE MIDDLEWARE
// Eliminates redundant MongoDB Atlas round-trips for
// read-heavy public endpoints (courses, classes, teachers)
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
  hits: number;
}

// Simple LRU map — evicts the least-recently-used entry when full
class LRUCache {
  private readonly capacity: number;
  private readonly store = new Map<string, CacheEntry>();

  constructor(capacity = 500) {
    this.capacity = capacity;
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    // Move to end (most recently used)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry;
  }

  set(key: string, entry: CacheEntry): void {
    if (this.store.has(key)) this.store.delete(key);
    else if (this.store.size >= this.capacity) {
      // Evict the least recently used (first key)
      const lruKey = this.store.keys().next().value;
      if (lruKey) this.store.delete(lruKey);
    }
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  // Invalidate all keys matching a prefix pattern
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  get size(): number {
    return this.store.size;
  }

  stats(): { size: number; keys: string[] } {
    return { size: this.store.size, keys: Array.from(this.store.keys()) };
  }
}

// ─── Singleton cache instance ─────────────────────────────────────────────────
export const apiCache = new LRUCache(500);

// ─── Build a deterministic cache key from the request ────────────────────────
const buildCacheKey = (req: Request): string => {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  return `${req.method}:${req.path}${qs ? '?' + qs : ''}`;
};

// ─── Cache Middleware Factory ─────────────────────────────────────────────────
/**
 * Creates a caching middleware for GET routes.
 * @param ttlSeconds Cache time-to-live in seconds
 * @param namespace Optional prefix for cache key grouping (used for invalidation)
 */
export const cacheMiddleware = (ttlSeconds: number, namespace?: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    const rawKey = buildCacheKey(req);
    const key = namespace ? `${namespace}:${rawKey}` : rawKey;
    const now = Date.now();

    // ── Cache hit ──
    const cached = apiCache.get(key);
    if (cached && cached.expiresAt > now) {
      cached.hits++;
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Hits', String(cached.hits));
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
      res.json(cached.data);
      return;
    }

    // ── Cache miss — intercept the response ──
    res.setHeader('X-Cache', 'MISS');

    // Monkey-patch res.json to capture the response body
    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiCache.set(key, {
          data: body,
          expiresAt: now + ttlSeconds * 1000,
          hits: 0,
        });
        logger.debug(`📦 Cached: ${key} (TTL: ${ttlSeconds}s)`);
      }
      return originalJson(body);
    };

    next();
  };
};

// ─── Cache Invalidation Helper ────────────────────────────────────────────────
/**
 * Middleware that busts the cache for a given namespace when a mutation succeeds.
 * Attach to POST/PATCH/DELETE routes.
 */
export const bustCache = (...namespaces: string[]) => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    namespaces.forEach((ns) => {
      const count = apiCache.invalidatePrefix(ns);
      if (count > 0) logger.debug(`🗑️  Cache busted: ${ns} (${count} entries)`);
    });
    next();
  };
};

// ─── Cache Stats Route Handler ────────────────────────────────────────────────
export const cacheStatsHandler = (_req: Request, res: Response): void => {
  res.json({ status: 'ok', cache: apiCache.stats() });
};
