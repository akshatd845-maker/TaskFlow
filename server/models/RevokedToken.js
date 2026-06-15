/**
 * RevokedToken Model
 *
 * Stores revoked JWT IDs (jti) so that logged-out or password-changed tokens
 * remain invalid across process restarts and multi-instance deployments.
 *
 * TTL index auto-deletes entries when the underlying JWT has expired,
 * so the collection stays naturally bounded.
 */

import mongoose from 'mongoose';

const revokedTokenSchema = new mongoose.Schema({
  jti: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Store the token's natural expiry so TTL index can clean it up automatically
  expiresAt: {
    type: Date,
    required: true
  }
});

// Auto-delete documents once expiresAt has passed
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RevokedToken', revokedTokenSchema);
