/**
 * HMAC signing classification per (action, messageType).
 *
 * Source: spec/06-security.md §5.6 — Message Signing Classification.
 *
 * 47 message types total:
 *   32 require HMAC in Critical mode (YES)
 *   15 are exempt in Critical mode (NO)
 *    2 are always exempt regardless of mode (BootNotification REQ, ConnectionLost)
 */

import { OsppAction } from '../actions/OsppAction';
import { MessageType } from '../enums/MessageType';

export type MessageSigningMode = 'All' | 'Critical' | 'None';

// ---------------------------------------------------------------------------
// Internal key format: "Action:MessageType"
// ---------------------------------------------------------------------------

type SigningKey = `${OsppAction}:${MessageType}`;

function key(action: OsppAction, messageType: MessageType): SigningKey {
  return `${action}:${messageType}`;
}

// ---------------------------------------------------------------------------
// Always-exempt: exempt regardless of MessageSigningMode
// ---------------------------------------------------------------------------

/** Messages exempt from HMAC in ALL modes, including "All". */
export const ALWAYS_EXEMPT: ReadonlySet<SigningKey> = new Set<SigningKey>([
  key(OsppAction.BOOT_NOTIFICATION, MessageType.REQUEST),   // No session key yet
  key(OsppAction.CONNECTION_LOST, MessageType.EVENT),        // Broker-generated LWT
]);

// ---------------------------------------------------------------------------
// Critical: require HMAC in "Critical" mode (32 of 47)
// ---------------------------------------------------------------------------

/** Message types that require HMAC in "Critical" mode. */
export const CRITICAL_MESSAGE_TYPES: ReadonlySet<SigningKey> = new Set<SigningKey>([
  // BootNotification RES (REQ is always-exempt)
  key(OsppAction.BOOT_NOTIFICATION, MessageType.RESPONSE),
  // AuthorizeOfflinePass
  key(OsppAction.AUTHORIZE_OFFLINE_PASS, MessageType.REQUEST),
  key(OsppAction.AUTHORIZE_OFFLINE_PASS, MessageType.RESPONSE),
  // ReserveBay
  key(OsppAction.RESERVE_BAY, MessageType.REQUEST),
  key(OsppAction.RESERVE_BAY, MessageType.RESPONSE),
  // CancelReservation
  key(OsppAction.CANCEL_RESERVATION, MessageType.REQUEST),
  key(OsppAction.CANCEL_RESERVATION, MessageType.RESPONSE),
  // StartService
  key(OsppAction.START_SERVICE, MessageType.REQUEST),
  key(OsppAction.START_SERVICE, MessageType.RESPONSE),
  // StopService
  key(OsppAction.STOP_SERVICE, MessageType.REQUEST),
  key(OsppAction.STOP_SERVICE, MessageType.RESPONSE),
  // TransactionEvent
  key(OsppAction.TRANSACTION_EVENT, MessageType.REQUEST),
  key(OsppAction.TRANSACTION_EVENT, MessageType.RESPONSE),
  // SessionEnded EVENT — creditsCharged used for billing
  key(OsppAction.SESSION_ENDED, MessageType.EVENT),
  // ChangeConfiguration
  key(OsppAction.CHANGE_CONFIGURATION, MessageType.REQUEST),
  key(OsppAction.CHANGE_CONFIGURATION, MessageType.RESPONSE),
  // Reset
  key(OsppAction.RESET, MessageType.REQUEST),
  key(OsppAction.RESET, MessageType.RESPONSE),
  // UpdateFirmware
  key(OsppAction.UPDATE_FIRMWARE, MessageType.REQUEST),
  key(OsppAction.UPDATE_FIRMWARE, MessageType.RESPONSE),
  // SetMaintenanceMode
  key(OsppAction.SET_MAINTENANCE_MODE, MessageType.REQUEST),
  key(OsppAction.SET_MAINTENANCE_MODE, MessageType.RESPONSE),
  // UpdateServiceCatalog
  key(OsppAction.UPDATE_SERVICE_CATALOG, MessageType.REQUEST),
  key(OsppAction.UPDATE_SERVICE_CATALOG, MessageType.RESPONSE),
  // SignCertificate
  key(OsppAction.SIGN_CERTIFICATE, MessageType.REQUEST),
  key(OsppAction.SIGN_CERTIFICATE, MessageType.RESPONSE),
  // CertificateInstall
  key(OsppAction.CERTIFICATE_INSTALL, MessageType.REQUEST),
  key(OsppAction.CERTIFICATE_INSTALL, MessageType.RESPONSE),
  // TriggerCertificateRenewal
  key(OsppAction.TRIGGER_CERTIFICATE_RENEWAL, MessageType.REQUEST),
  key(OsppAction.TRIGGER_CERTIFICATE_RENEWAL, MessageType.RESPONSE),
  // TriggerMessage
  key(OsppAction.TRIGGER_MESSAGE, MessageType.REQUEST),
  key(OsppAction.TRIGGER_MESSAGE, MessageType.RESPONSE),
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a message type is classified as critical (requires HMAC in Critical mode).
 */
export function isCritical(action: OsppAction, messageType: MessageType): boolean {
  return CRITICAL_MESSAGE_TYPES.has(key(action, messageType));
}

/**
 * Determine whether a specific message requires HMAC given the current signing mode.
 *
 * Rules (spec §5.6):
 *   - "None"     → never requires HMAC
 *   - "Critical" → only critical message types require HMAC
 *   - "All"      → all messages require HMAC except always-exempt
 */
export function requiresHmac(
  action: OsppAction,
  messageType: MessageType,
  mode: MessageSigningMode,
): boolean {
  const k = key(action, messageType);

  // Always-exempt messages never require HMAC, regardless of mode
  if (ALWAYS_EXEMPT.has(k)) {
    return false;
  }

  switch (mode) {
    case 'None':
      return false;
    case 'Critical':
      return CRITICAL_MESSAGE_TYPES.has(k);
    case 'All':
      return true;
  }
}
