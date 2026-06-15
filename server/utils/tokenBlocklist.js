/**
 * JWT Token Blocklist — MongoDB-Backed (Persistent)
 *
 * Stores revoked JTI (JWT ID) claims in MongoDB so that logged-out tokens
 * remain invalid across process restarts and multi-instance deployments.
 *
 * The RevokedToken collection has a TTL index on `expiresAt`, so entries
 * are automatically removed when the underlying JWT would have expired anyway,
 * keeping the collection naturally bounded.
 *
 * In-process cache: a small Map is kept in memory for sub-millisecond hot-path
 * lookups (e.g., every authenticated request). The cache entry only lives for
 * the shorter of (token TTL) or (5 minutes), then falls back to MongoDB.
 * This avoids a DB round-trip on every request while still surviving restarts.
 */

import RevokedToken from '../models/RevokedToken.js';

// ── In-process hot cache: jti → expiry ms ────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PRUNE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Self-pruning timer for the in-memory cache
setInterval(() => {
  const now = Date.now();
  for (const [jti, expiry] of cache.entries()) {
    if (now > expiry) cache.delete(jti);
  }
}, PRUNE_INTERVAL_MS).unref();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Revoke a token by its jti.
 * @param {string} jti  - JWT ID claim
 * @param {number} expiresAt - JWT `exp` claim (Unix seconds)
 */
export const revokeToken = async (jti, expiresAt) => {
  if (!jti) return;

  const expiresAtDate = new Date(expiresAt * 1000); // convert seconds → ms → Date

  // Write to MongoDB (upsert is safe if called twice)
  try {
    await RevokedToken.updateOne(
      { jti },
      { $set: { jti, expiresAt: expiresAtDate } },
      { upsert: true }
    );
  } catch (e) {
    // Non-fatal — token may already exist (duplicate key on upsert race)
    if (e.code !== 11000) {
      console.error('[tokenBlocklist] revokeToken DB error:', e.message);
    }
  }

  // Also warm the local cache
  const cacheExpiry = Math.min(expiresAt * 1000, Date.now() + CACHE_TTL_MS);
  cache.set(jti, cacheExpiry);
};

/**
 * Returns true if the jti has been revoked.
 * Checks cache first, falls back to MongoDB.
 * @param {string} jti
 * @returns {Promise<boolean>}
 */
export const isTokenRevoked = async (jti) => {
  if (!jti) return false;

  // 1. Hot-path: check in-memory cache
  const cached = cache.get(jti);
  if (cached !== undefined) {
    if (Date.now() > cached) {
      cache.delete(jti); // expired cache entry
      return false;
    }
    return true; // cache hit — token is revoked
  }

  // 2. Cold-path: check MongoDB (covers post-restart case)
  try {
    const exists = await RevokedToken.exists({ jti });
    if (exists) {
      // Warm the cache so subsequent requests are fast
      cache.set(jti, Date.now() + CACHE_TTL_MS);
      return true;
    }
  } catch (e) {
    // If DB is down during a check, fail-open (allow token) to prevent lockout
    console.error('[tokenBlocklist] isTokenRevoked DB error:', e.message);
  }

  return false;
};

// Keep default export for backward-compat with any direct imports
export default { revokeToken, isTokenRevoked };
