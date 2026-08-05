/**
 * HMAC-SHA256 message signing and verification for OSPP.
 *
 * Source: spec/06-security.md §5.2–§5.5, §5.7.
 *
 * The implementation moved to `./MessageMac.js`, which is browser-safe, because
 * everything on the wire is signed (§5.6) and verifying an inbound MAC is
 * therefore something a STATION does on every message it receives — and
 * station-side code imports `@ospp/protocol`, not `@ospp/protocol/server`.
 * While the only implementation sat behind `node:crypto` on the server subpath,
 * the reference implementation could not verify an inbound MAC at all from its
 * main entry point.
 *
 * This module is kept so `@ospp/protocol/server` keeps its existing exports.
 */

export {
  computeMac,
  verifyMac,
  signMessage,
  isUsableSessionKey,
} from './MessageMac.js';
