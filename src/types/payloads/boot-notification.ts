import type { StationId, Timestamp, NetworkInfo, StationCapabilities } from '../common.js';
import type { BayTopology } from '../topology.js';
import { BootReason } from '../../enums/BootReason.js';
import type { MessageSigningMode } from '../../crypto/MessageSigningRegistry.js';

/** BootNotification REQUEST — Station → Server. */
export interface BootNotificationRequest {
  stationId: StationId;
  firmwareVersion: string;
  stationModel: string;
  stationVendor: string;
  serialNumber: string;
  /**
   * The station's RE-DECLARED PHYSICAL TOPOLOGY — the same bays and program
   * ordinals it declared at provisioning, restated on every boot so the server
   * can detect that the two no longer agree. Labels are NOT re-declared and are
   * NOT compared.
   *
   * The declaration MUST be STABLE between boots while the hardware is
   * unchanged; how firmware achieves that is its own business, and the contract
   * is the stability, not the mechanism. A station MUST NOT alter it to match
   * what the server expected — the declaration describes hardware, and silently
   * agreeing would hide a real hardware change.
   *
   * A mismatch in either direction puts the station in `Pending` with
   * `3018 TOPOLOGY_MISMATCH`, NOT `Rejected`: `Pending` keeps the command
   * channel open so an operator can repair the disagreement.
   *
   * 1..64 entries.
   */
  bays: BayTopology[];
  uptimeSeconds: number;
  pendingOfflineTransactions: number;
  timezone: string;
  bootReason: BootReason;
  capabilities: StationCapabilities;
  networkInfo: NetworkInfo;
  /**
   * The MessageSigningMode the station is CURRENTLY operating in, as loaded from
   * NVS at this boot. Added by spec 0.31.0 and OPTIONAL: a station that omits it
   * says nothing, which is what every station said before 0.31.0.
   *
   * Deliberately NOT part of `capabilities` — that object is feature flags, four
   * booleans describing what the station SUPPORTS; this is configuration state,
   * describing what it is DOING.
   *
   * It rides this message because the BootNotification REQUEST is one of the three
   * structural exemptions from message signing (06-security.md §5.6), and so the
   * only message that still arrives when the station and the server disagree about
   * the mode. Every other channel that could report it — GetConfiguration included
   * — is among the 44 signed types, so a station that has failed closed cannot use
   * any of them. Without this field that state is not merely undiagnosed, it is
   * inexpressible.
   */
  messageSigningMode?: MessageSigningMode;
}

/** Common fields present in every BootNotification RESPONSE variant. */
interface BootNotificationResponseBase {
  serverTime: Timestamp;
  heartbeatIntervalSec: number;
}

/**
 * What the server expected and what arrived, on a `3018 TOPOLOGY_MISMATCH`.
 *
 * Typed against the same BayTopology the request's `bays[]` uses -- one
 * definition instead of two copies.
 */
export interface BootTopologyMismatchDetails {
  /** The topology recorded for this station at provisioning. */
  expected: BayTopology[];
  /** The topology this BootNotification declared, echoed back. */
  declared: BayTopology[];
}

/** BootNotification RESPONSE — Server → Station (discriminated union). */
export type BootNotificationResponse =
  | (BootNotificationResponseBase & {
      status: 'Accepted';
      configuration?: Record<string, string>;
      /**
       * REQUIRED on every Accepted response, unconditionally (§5.3). It was
       * previously conditional on `MessageSigningMode` — which is station
       * configuration, not a field of this message, so the condition was not
       * expressible in JSON Schema and would have stayed prose forever. It was
       * OPTIONAL in this type, which is precisely the shape §5.3 calls
       * malformed.
       *
       * A station that receives Accepted WITHOUT it MUST treat the response as
       * malformed: log `1005`, stay in `Booting`, retry per CORE-011. It MUST
       * NOT fall back to unsigned operation — a station that proceeds keyless
       * can sign nothing, has everything it sends rejected, and is named as the
       * suspect in the resulting MAC-failure events.
       */
      sessionKey: string;
    })
  | (BootNotificationResponseBase & {
      status: 'Rejected';
      retryInterval: number;
      // Required when status is Rejected: boot-notification-response.schema.json
      // makes `retryInterval`, `errorCode` and `errorText` a single `then.required`
      // group. They were absent here — not even optional — so the spec's own
      // Rejected vectors did not type-check. Same shape as every other Rejected
      // variant in the SDK (reserve-bay.ts:14).
      errorCode: number;
      errorText: string;
      supportedVersions?: string[];
    })
  | (BootNotificationResponseBase & {
      status: 'Pending';
      retryInterval: number;
      configuration?: Record<string, string>;
      /**
       * REQUIRED on every Pending response too, and leaving it out would have
       * been fatal. A Pending station ANSWERS server commands; every command is
       * signed; both the sending and the receiving path fail closed on a
       * missing key. Withhold it and the server may not send, the station may
       * not accept, and it may not answer — the repair channel the Pending
       * window exists for would be closed by the signing rules landed in the
       * same arc (boot-notification.md §5.3).
       */
      sessionKey: string;
      /** Present when the reason is `3018 TOPOLOGY_MISMATCH`. */
      errorCode?: number;
      errorText?: string;
      /**
       * REQUIRED on a Pending response carrying 3018, absent otherwise. "A
       * station held out of service for a reason nobody can see is a station
       * nobody can repair."
       */
      details?: BootTopologyMismatchDetails;
    });
