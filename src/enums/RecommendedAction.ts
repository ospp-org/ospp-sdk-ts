/**
 * The per-code corrective action from the spec registry (07-errors.md §3).
 *
 * All 119 registry codes are transcribed. This SDK carried NONE of them until
 * 0.28.0 — `OsppErrorMeta` has no such member and no accessor existed — while
 * ospp-sdk-php carried eleven. That eleven was read once as the registry being
 * incomplete; it is not. §3 gives a Recommended Action for 118 of 118 rows with
 * no empty cell, so the gap was a transcription hole on the SDK side of the
 * wire, and `npm run check:recommended-action` now refuses to let one reopen.
 *
 * WHAT §1.4 REQUIRES, AND WHAT IT FORBIDS A TEST FROM ASSERTING
 *
 * The value MUST carry the action §3 gives for the code, and is a property of
 * the CODE, not the occurrence. But equality is on "the corrective action, not
 * on the bytes": a server MAY translate the value, and MAY shorten it to fit
 * Appendix C, provided the action survives. §1.4 draws the conclusion itself —
 * "Byte-identity is not achievable in any case, since translation is expressly
 * permitted, so a conformance test MUST NOT assert it."
 *
 * So the gate does not compare these strings to the registry. It checks the
 * properties that survive a translation: that every code HAS an action, that it
 * fits Appendix C's 1..500 bound, that no two codes share one string (the
 * signature of the generic substitution §1.4 forbids), and that a branching
 * entry still names its `details` discriminator, its branch tokens and the
 * parties it addresses. Coverage and structure, never content.
 *
 * The values are the registry cell with Markdown links flattened to their label
 * text and whitespace collapsed; nothing else is changed. Every cell fits the
 * wire bound as written at the pinned ref (longest 494 of 500), so no shortening
 * is needed anywhere and none is done — and `npm run check:doc-claims` derives that
 * 494 from the map below rather than trusting this sentence for it.
 *
 * There is deliberately no matching `errorDescription` map. That field is
 * PER-OCCURRENCE and written by the emitter; §1.4 states that an implementation
 * MUST NOT emit a registry Description cell verbatim and that "a generator MUST
 * NOT be built to do so".
 *
 * Source: spec/07-errors.md §3.1–§3.6, at the ref pinned in `.spec-ref`.
 */

import { OsppErrorCode } from './OsppErrorCode.js';

export const RECOMMENDED_ACTION: Readonly<Record<OsppErrorCode, string>> = {

  // 07-errors.md §3.1 — Transport (1xxx)
  [OsppErrorCode.TRANSPORT_GENERIC]:
    'Retry with exponential backoff; if persistent, report to server.',
  [OsppErrorCode.MQTT_CONNECTION_LOST]:
    'Reconnect with exponential backoff (1s→30s cap). Buffer events locally. See §5.1.',
  [OsppErrorCode.MQTT_PUBLISH_FAILED]:
    'Retry publish; if repeated, check broker connectivity. Buffer message for later delivery.',
  [OsppErrorCode.TLS_HANDSHAKE_FAILED]:
    'Check the negotiated TLS version against the 1.2 floor and the configured cipher suites; the certificate is **not** what was rejected, so do not regenerate, re-provision, or discard credentials in response to this code. Report via SecurityEvent [MSG-012].',
  [OsppErrorCode.CERTIFICATE_ERROR]:
    'Station: never enter provisioning mode and never discard stored credentials. Branch on `details.cause`; if it is absent, read your own certificate\'s `notAfter`. `expired` — enter offline-only BLE mode (§4.7.3) and await server-triggered renewal. `revoked` / `invalid-chain` / `self-signed` — keep credentials, stay off the broker, alert the operator. Server: reject the connection, alert the operator.',
  [OsppErrorCode.INVALID_MESSAGE_FORMAT]:
    'Log it; do NOT resend the identical bytes — the sender must correct them. On the boot path this does not suspend CORE-011: a station rejected with `1005` MUST keep retrying at the response\'s `retryInterval`, exactly as for `1007` and `2001` (§5.2 — unlimited). One that stops is unrecoverable: it accepts no commands until booted. `recoverable: false` means someone must act, not stop retrying.',
  [OsppErrorCode.UNKNOWN_ACTION]:
    '**Branch on whether a RESPONSE schema exists for the action.** Known to the protocol but unsupported here: reply `status: "Rejected"` with this code on that action\'s own RESPONSE (§2.1). Unknown to the protocol: no RESPONSE schema exists and all are closed, so log and discard (Chapter 02 §11). Either branch **MAY** be reported as an unsolicited EVENT (§2.2). Sender: verify the action name.',
  [OsppErrorCode.PROTOCOL_VERSION_MISMATCH]:
    'Station: keep retrying BootNotification at `retryInterval` (default 30 s) per CORE-011, in the `Rejected` restricted state; do **NOT** stop retrying. Record `supportedVersions` for diagnostics. Operator: upgrade station firmware to a version in `supportedVersions`, or add the station\'s version to the server\'s set. Server: reject with `Rejected`, including both `supportedVersions` and `retryInterval`.',
  [OsppErrorCode.BLE_RADIO_ERROR]:
    'Reset BLE stack. If persistent, disable BLE and report via SecurityEvent [MSG-012].',
  [OsppErrorCode.DNS_RESOLUTION_FAILED]:
    'Retry after 30s. Verify DNS server configuration. Fall back to IP address if configured.',
  [OsppErrorCode.MESSAGE_TIMEOUT]:
    'Retry per the action\'s retry policy (see §5). If max retries exhausted, escalate to ERROR.',
  [OsppErrorCode.URL_UNREACHABLE]:
    'Retry with exponential backoff. Verify network connectivity and URL correctness.',
  [OsppErrorCode.MAC_VERIFICATION_FAILED]:
    'Reject the message. Log SecurityEvent [MSG-012] with `type: "MacVerificationFailure"`. 3+ failures from same source within 60s → flag as potentially compromised.',
  [OsppErrorCode.MAC_MISSING]:
    'Reject the message — never process it unverified. Log SecurityEvent [MSG-012]. Note where the fault is: a conforming sender **refuses to send** rather than sending unsigned (Chapter 06 §5.7), so a message reaching this code was produced by a sender that did not fail closed.',
  [OsppErrorCode.MESSAGE_TOO_LARGE]:
    'Reject the message. Sender must reduce payload size — e.g., split MeterValues into multiple messages.',

  // 07-errors.md §3.2 — Authentication & Authorization (2xxx)
  [OsppErrorCode.AUTH_GENERIC]:
    'Check credentials and permissions. Contact operator if persistent.',
  [OsppErrorCode.STATION_NOT_REGISTERED]:
    'Station: keep retrying BootNotification at `retryInterval` (default 30 s) per CORE-011 — the retry succeeds once the operator acts. Do NOT enter provisioning mode and do NOT alter stored credentials: you hold credentials the broker accepted, and re-provisioning is operator-initiated. Operator: register this `stationId` in the management portal, or correct it if mistyped; check it was not dropped by a tenant move or a database restore.',
  [OsppErrorCode.OFFLINE_PASS_INVALID]:
    'App: request a new OfflinePass from the server. Station: log SecurityEvent [MSG-012] with `type: "OfflinePassRejected"`.',
  [OsppErrorCode.OFFLINE_PASS_EXPIRED]:
    'App: request a new OfflinePass from the server. Pass has a maximum validity of 24 hours.',
  [OsppErrorCode.OFFLINE_EPOCH_REVOKED]:
    'App: request a new OfflinePass with the current epoch. Station epoch is updated via ChangeConfiguration [MSG-013].',
  [OsppErrorCode.OFFLINE_COUNTER_REPLAY]:
    'Reject. Station (authorize-time): log SecurityEvent [MSG-012] with `type: "OfflinePassRejected"`. Server (reconcile-time): hard-reject the TransactionEvent and emit the gate SecurityEvent (`reconciliation.md` §6.3). App: if legitimate, request a new OfflinePass.',
  [OsppErrorCode.OFFLINE_STATION_MISMATCH]:
    'App: the OfflinePass is not valid for this station. Request a new pass or use an unrestricted pass.',
  [OsppErrorCode.COMMAND_NOT_SUPPORTED]:
    'Server: do not retry. Check station capabilities from BootNotification.',
  [OsppErrorCode.ACTION_NOT_PERMITTED]:
    'Verify the user\'s role and permissions. Contact the operator admin if elevated access is needed.',
  [OsppErrorCode.JWT_EXPIRED]:
    'App: use the refresh token to obtain a new access token. If refresh token is also expired, re-authenticate.',
  [OsppErrorCode.JWT_INVALID]:
    'App: clear stored tokens and re-authenticate. May indicate token tampering.',
  [OsppErrorCode.SESSION_TOKEN_EXPIRED]:
    'Browser: restart the payment flow from the QR code scan.',
  [OsppErrorCode.SESSION_TOKEN_INVALID]:
    'Browser: restart the payment flow. Do not retry with the same token.',
  [OsppErrorCode.BLE_AUTH_FAILED]:
    'App: disconnect and retry the BLE handshake. If persistent, report to the server when online.',
  [OsppErrorCode.OFFLINE_PASS_REVOKED]:
    'App: request a new OfflinePass. Server: log SecurityEvent [MSG-012] with `type: "OfflinePassRejected"`. The original pass is permanently dead; the device must obtain a new one.',
  [OsppErrorCode.OFFLINE_ORG_MISMATCH]:
    'Server: log SecurityEvent [MSG-012] with `type: "OfflinePassRejected"`. Cross-organization use is not permitted. The pass holder must request a pass scoped to the operator they wish to transact with.',
  [OsppErrorCode.OFFLINE_USER_MISMATCH]:
    'Server: log SecurityEvent [MSG-012] with `type: "OfflinePassRejected"`. Indicates either a station bug, station-side state corruption, or a deliberate user-id forgery.',
  [OsppErrorCode.OFFLINE_RECEIPT_MISMATCH]:
    'Server: log SecurityEvent [MSG-012] with `type: "OfflinePassRejected"`. The `details.field` element identifies the mismatched field (`offlineTxId` / `offlinePassId` / `userId` / `deviceId` / `receipt.data` for the §3 stored-vs-arriving comparison); `details.signedValue` and `details.expectedValue` carry the forensic pair. This is a strong indicator of envelope tampering or station-side state corruption.',
  [OsppErrorCode.SERVER_AUTH_NONCE_MISMATCH]:
    'Station: reject the handshake and disconnect. App: SHOULD obtain a fresh `signedAuthorization` bound to the current `appNonce` and retry. Server: log SecurityEvent [MSG-012] with `type: "ServerSignedAuthReplay"` on the next reconciliation.',
  [OsppErrorCode.PROVISIONING_TOKEN_INVALID]:
    'Station: display the error and **await a new provisioning token** — no retry with this token can succeed. Operator: issue a fresh token. Do not regenerate keys in response to this error; the keys are not what was rejected.',

  // 07-errors.md §3.3 — Session & Bay (3xxx)
  [OsppErrorCode.SESSION_GENERIC]:
    'Inspect the `errorDescription` for specific context.',
  [OsppErrorCode.BAY_BUSY]:
    'Wait for the current session to complete, or select a different bay. Server: refund 100% if this rejects a StartService [MSG-005].',
  [OsppErrorCode.BAY_NOT_READY]:
    'Wait and retry. Check StatusNotification [MSG-009] for the bay\'s current state; if none has arrived at all, the station is not `Operational` and the boot is what needs attention.',
  [OsppErrorCode.SERVICE_UNAVAILABLE]:
    'Branch on `details.cause`; absent means `station-reported`. App: select a different service, or a different bay. Station and server: echo the refused `programNumber` — REQUIRED on a `Rejected` StartService response, `details.programNumber` on REST. `station-reported`: wait for the station to report the ordinal available again; nothing server-side changes. `disabled`: an operator must re-enable it. `consumable`: refill at that ordinal.',
  [OsppErrorCode.INVALID_SERVICE]:
    'Verify the service ID against the station\'s UpdateServiceCatalog [MSG-021] data.',
  [OsppErrorCode.BAY_NOT_FOUND]:
    'Verify the bay ID. The bay may have been decommissioned or the ID may be incorrect.',
  [OsppErrorCode.SESSION_NOT_FOUND]:
    'Verify the session ID. For StopService [MSG-006], the session may have already ended (timer expiry or auto-stop).',
  [OsppErrorCode.SESSION_MISMATCH]:
    'Verify the session ID. Use StatusNotification [MSG-009] to determine the active session on the bay.',
  [OsppErrorCode.DURATION_INVALID]:
    'Specify a valid duration. Minimum is service-defined (typically 60 seconds).',
  [OsppErrorCode.HARDWARE_ACTIVATION_FAILED]:
    'Server: refund 100%. Station: transition bay to `Faulted`, report via SecurityEvent [MSG-012]. Operator: dispatch technician.',
  [OsppErrorCode.MAX_DURATION_EXCEEDED]:
    'Reduce the requested duration to at most `MaxSessionDurationSeconds` seconds (default 900s).',
  [OsppErrorCode.BAY_MAINTENANCE]:
    'Wait for maintenance to complete. Operator: clear maintenance mode when work is done.',
  [OsppErrorCode.RESERVATION_NOT_FOUND]:
    'Do not retry. Start a new reservation flow if needed.',
  [OsppErrorCode.RESERVATION_EXPIRED]:
    'Create a new reservation. Default TTL is `ReservationDefaultTTL` (300 seconds).',
  [OsppErrorCode.BAY_RESERVED]:
    'Wait for the reservation to expire, or select a different bay.',
  [OsppErrorCode.PAYLOAD_INVALID]:
    'Fix the payload values. On a REST route the Error Object carries `details` (Appendix C) naming the failing member. On MQTT it does not exist: the three response schemas that can carry this code are closed without it, so `errorCode` and `errorText` are all the station can say. If the offending member is a well-formed but unknown identifier, use that identifier kind\'s code, not this one.',
  [OsppErrorCode.ACTIVE_SESSIONS_PRESENT]:
    'Stop all active sessions first, then retry the operation — or, where the reboot is needed regardless, re-issue the Reset with `force: true`, which the station settles under the operator-disable policy rather than refusing.',
  [OsppErrorCode.PROGRAM_NOT_DECLARED]:
    'Station: reject, echo the refused `programNumber` in the response, and run nothing. Do **NOT** substitute a neighbouring ordinal or clamp to the highest declared one — that charges for one thing and delivers another. Server: the service→program binding names an ordinal this station does not have. Correct the binding, or re-provision the station if its hardware genuinely changed. Operator: compare the station\'s declared topology against the catalog binding.',
  [OsppErrorCode.TOPOLOGY_MISMATCH]:
    'Station: keep the declaration stable and keep retrying BootNotification per CORE-011; answer commands while `Pending`. Do **NOT** alter the declaration to match the server — it describes hardware, and agreeing silently hides a real change. Operator: read `details`. If the hardware genuinely changed, re-provision the station, which re-creates the bay records. If it did not, correct the station record server-side; the next boot is then accepted.',
  [OsppErrorCode.SERVICE_NOT_BOUND]:
    'Operator: create the binding for this (bay, service) pair, naming an ordinal the bay declared at provisioning. Server: name the bay and the service in `details`, and do not dispatch StartService. The customer has not been charged, because nothing was started — say so, rather than reporting a station fault for a condition no station has seen.',

  // 07-errors.md §3.4 — Payment & Credit (4xxx)
  [OsppErrorCode.PAYMENT_GENERIC]:
    'Inspect the `errorDescription` for context. Contact support if persistent.',
  [OsppErrorCode.INSUFFICIENT_BALANCE]:
    'App: show top-up prompt. Web: redirect to payment page. The user must purchase more credits before starting a session.',
  [OsppErrorCode.OFFLINE_LIMIT_EXCEEDED]:
    'App: the user must go online to request a new OfflinePass (or top up credits).',
  [OsppErrorCode.OFFLINE_RATE_LIMITED]:
    'Wait the required interval (default 60 seconds) before attempting another offline transaction.',
  [OsppErrorCode.OFFLINE_PER_TX_EXCEEDED]:
    'Select a less expensive service or reduce the requested duration.',
  [OsppErrorCode.PAYMENT_FAILED]:
    'User: try a different payment method. Web: restart the payment flow.',
  [OsppErrorCode.PAYMENT_TIMEOUT]:
    'Check payment status with the processor. If unresolved, mark as expired and inform the user.',
  [OsppErrorCode.REFUND_FAILED]:
    'Retry the refund. If persistent, escalate to manual refund by accounting team.',
  [OsppErrorCode.WEBHOOK_SIGNATURE_INVALID]:
    'Reject the webhook. Log SecurityEvent. Do NOT process the payment. Alert security team.',
  [OsppErrorCode.CSR_INVALID]:
    'Station: branch on `details.phase`. `first-provision` or `renewal` — regenerate the keypair and CSR correctly and resubmit; nothing is bound yet. `retry` — do NOT regenerate: a fresh key is answered `4015`, not recoverable. Resubmit a well-formed CSR over the bound key, or request a new token. Absent on REST means `retry`; on SignCertificate [MSG-022] it is always absent and means `renewal`. Server: log the validation failure.',
  [OsppErrorCode.CERTIFICATE_CHAIN_INVALID]:
    'Server: verify the CA chain is complete and correctly ordered. Station: report the specific chain validation error in the response.',
  [OsppErrorCode.CERTIFICATE_TYPE_MISMATCH]:
    'Verify the `certificateType` field matches between SignCertificate and CertificateInstall.',
  [OsppErrorCode.RENEWAL_DENIED]:
    'Contact the operator. The server administrator must approve the renewal or adjust the policy.',
  [OsppErrorCode.KEYPAIR_GENERATION_FAILED]:
    'Log SecurityEvent with `HardwareFault` type. Dispatch technician to inspect the station\'s crypto hardware.',
  [OsppErrorCode.PROVISIONING_KEY_MISMATCH]:
    'Station: **do NOT retry with this token** — no retry can succeed, because the token is permanently bound to the earlier key. Request a **new** provisioning token from the operator, then provision again with the keys currently held. Server: log the mismatch; the already-issued certificate is unaffected.',
  [OsppErrorCode.PROVISIONING_KEY_REUSE]:
    'Station: recovery depends on `details.phase`. `first-provision` — generate a separate key pair for the colliding role and resubmit; this rejection does not consume the token. `retry` — do NOT regenerate: the bound keys are what was certified, and a fresh key is answered `4015`, which is not recoverable. Resubmit the keys already bound, or request a new token. If `details.phase` is absent, assume `retry`. Firmware deriving two roles from one key slot must be updated.',
  [OsppErrorCode.PROVISIONING_REQUEST_INVALID]:
    'Station: correct the offending property and resubmit on the **same** token — this rejection does not consume it. Inspect `details` for the failing property path. Do **not** regenerate keys: the keys are not what was rejected, and on a retry a fresh key would be answered `4015`, which is not recoverable. Server: name the failing property and the constraint it violated in `details`.',
  [OsppErrorCode.PROVISIONING_TOKEN_CONSUMED]:
    'Station: do NOT regenerate keys on any branch — a fresh key is answered `4015`. Branch on `details.reason`. `already_consumed` — another request holds this token; retry unchanged after a short delay, bounded, until it resolves to the certificate or to the branch below. `consumed_without_certificate` — this token can never issue one; request a new provisioning token. If `details.reason` is absent, assume `already_consumed`. Operator: issue a fresh token.',
  [OsppErrorCode.PUBLIC_KEY_INVALID]:
    'Station: submit ECDSA P-256 key material only. Recovery depends on `details.phase`. `first-provision` — generate a correct P-256 key for the named role and resubmit on the same token; nothing is bound yet. `retry` — do NOT generate a new key: a fresh key is answered `4015`. Resubmit the key already bound, or request a new token if it cannot be produced. If `details.phase` is absent, assume `retry`. Server: name the rejected member in `details.field`.',
  [OsppErrorCode.BAY_COUNT_MISMATCH]:
    'Station: correct the declared `bays` and resubmit on the **same** token — it is not consumed. Do **not** regenerate keys: a later retry with a fresh key is answered `4015`, which is unrecoverable. Read `details.declaredBayNumbers` against `details.registeredBayNumbers`; their difference either way is the fault. If the declaration is truthful the operator corrects the station record; if not, the firmware\'s bay table is corrected. Server: carry both **sets** in `details`, never counts alone.',

  // 07-errors.md §3.5 — Station Hardware & Software (5xxx)
  [OsppErrorCode.HARDWARE_GENERIC]:
    'Log and monitor. If persistent, transition bay to Faulted and dispatch technician.',
  [OsppErrorCode.PUMP_SYSTEM]:
    'Immediately stop active session on affected bay. Dispatch technician. Do not attempt restart without physical inspection.',
  [OsppErrorCode.FLUID_SYSTEM]:
    'Log warning. If fluid meter values drop below threshold during session, alert operator. May self-resolve when supply is restored.',
  [OsppErrorCode.CONSUMABLE_SYSTEM]:
    'Alert operator to refill consumable supply. Bay MAY continue with reduced-service mode if possible.',
  [OsppErrorCode.ELECTRICAL_SYSTEM]:
    'Station: engage emergency shutdown **immediately and unconditionally** — do not gate it on the voltage reading. Bay → `Faulted`, enter Level 3 (§7.2); report via SecurityEvent [MSG-012] with `type: "HardwareFault"`. The bay **MUST NOT** return to service on voltage normalising alone: clearing requires physical intervention, operator verification, and a station reboot. Operator: dispatch a technician to inspect the supply, relays, and incoming phases.',
  [OsppErrorCode.PAYMENT_HARDWARE]:
    'Disable local payment option. Mobile app and web payments remain available. Dispatch technician for payment hardware service.',
  [OsppErrorCode.HEATING_SYSTEM]:
    'Disable temperature-dependent services. Other services MAY continue. Auto-recoverable if temperature returns to safe range.',
  [OsppErrorCode.MECHANICAL_SYSTEM]:
    'Bay → Faulted. Dispatch technician. Requires physical intervention.',
  [OsppErrorCode.SENSOR_FAILURE]:
    'Log degraded readings. Switch to time-based billing if metering sensor fails during active session. Alert operator.',
  [OsppErrorCode.EMERGENCY_STOP]:
    'Immediately halt all active sessions. All bays → Faulted. Requires physical reset of E-stop button and operator verification before resuming.',
  [OsppErrorCode.DOWNLOAD_FAILED]:
    'Verify the `firmwareUrl` is reachable. Retry the UpdateFirmware [MSG-016] command. Check station network connectivity.',
  [OsppErrorCode.CHECKSUM_MISMATCH]:
    'Do NOT install. Report via SecurityEvent [MSG-012]. Server: verify the binary and checksum, then retry.',
  [OsppErrorCode.VERSION_ALREADY_INSTALLED]:
    'No action required. Server: update its records to reflect the station\'s current firmware version.',
  [OsppErrorCode.INSUFFICIENT_STORAGE]:
    'Station: free space from diagnostics logs, buffered telemetry, and cached or partial downloads **only**. Do **NOT** erase, truncate, or overwrite the retained rollback partition to make room. If the binary still does not fit, abort the update, stay on the current firmware, and report `Failed` via FirmwareStatusNotification. Server/Operator: supply a smaller build, or service the station to expand storage.',
  [OsppErrorCode.INSTALLATION_FAILED]:
    'Station: report via SecurityEvent [MSG-012]. Dispatch technician — may indicate flash storage failure.',
  [OsppErrorCode.UPLOAD_FAILED]:
    'Verify the `uploadUrl` is reachable and accepts uploads. Retry the GetDiagnostics [MSG-018] command.',
  [OsppErrorCode.INVALID_TIME_WINDOW]:
    'Fix the time window parameters in the GetDiagnostics request.',
  [OsppErrorCode.NO_DIAGNOSTICS_AVAILABLE]:
    'Request a broader time window, or wait for the station to accumulate more diagnostic data.',
  [OsppErrorCode.INVALID_CATALOG]:
    'Fix the catalog payload. The response for this message is a **closed** schema with no `details` member (`update-service-catalog-response.schema.json`), so `errorCode` and `errorText` are the whole of what the station can say — the server locates the offending entry by re-validating the payload it sent against the service-item schema, not by reading the reply.',
  [OsppErrorCode.UNSUPPORTED_SERVICE]:
    'Station: respond `Rejected` with this code and leave the previous catalog in force. Server/Operator: the catalog names a service this station cannot run. Correct the binding, remove the entry, or re-provision the station if its hardware genuinely changed. Do **NOT** re-send unchanged.',
  [OsppErrorCode.CATALOG_TOO_LARGE]:
    'Reduce the number of services in the catalog. Check station capabilities for maximum catalog size.',
  [OsppErrorCode.SOFTWARE_GENERIC]:
    'Log error with stack trace (if available). Report via SecurityEvent [MSG-012].',
  [OsppErrorCode.FIRMWARE_ERROR]:
    'Station: attempt watchdog-triggered reset. If error persists after reset, roll back to previous firmware partition. Report via SecurityEvent [MSG-012].',
  [OsppErrorCode.CONFIGURATION_ERROR]:
    'Station: load default configuration for missing/invalid keys. Report the specific key(s) via SecurityEvent [MSG-012]. Server: push corrected config via ChangeConfiguration [MSG-013].',
  [OsppErrorCode.STORAGE_ERROR]:
    'Station: retry the storage operation. If persistent, log SecurityEvent and disable features that require storage (offline tx log).',
  [OsppErrorCode.WATCHDOG_RESET]:
    'Station: send BootNotification [MSG-001] with `bootReason: "Watchdog"` after reboot. Server: flag for monitoring — 3+ watchdog resets in 24h triggers operator alert.',
  [OsppErrorCode.MEMORY_ERROR]:
    'Station: release non-essential buffers (meter value history, BLE advertising data). If insufficient, perform a soft reset. Report via SecurityEvent.',
  [OsppErrorCode.CLOCK_ERROR]:
    'Station: sync clock from next Heartbeat response. If RTC hardware is faulty, use server time exclusively. Flag for operator — large drift may indicate battery failure.',
  [OsppErrorCode.OPERATION_IN_PROGRESS]:
    'Retry after the in-progress operation completes. Check FirmwareStatusNotification [MSG-017] or DiagnosticsNotification [MSG-019] for progress. Where the cause is a full command queue, reduce the rate of concurrent commands to this station rather than retrying immediately.',
  [OsppErrorCode.CONFIGURATION_KEY_READONLY]:
    'Use a different key, or accept the current value. Read-only keys can only be changed via firmware update or provisioning.',
  [OsppErrorCode.INVALID_CONFIGURATION_VALUE]:
    'Check the valid range and type for the configuration key in the configuration registry.',
  [OsppErrorCode.RESET_FAILED]:
    'Dispatch technician. A physical power cycle may be required. Report via SecurityEvent [MSG-012].',
  [OsppErrorCode.BUFFER_FULL]:
    'Station: reject new StartService requests. Reconnect to MQTT to flush buffered TransactionEvents. Server: prioritize reconnection and reconciliation for this station.',
  [OsppErrorCode.FIRMWARE_SIGNATURE_INVALID]:
    'Do NOT install. Report via SecurityEvent [MSG-012] with `FirmwareIntegrityFailure` type. Server: verify signing key and re-publish firmware.',
  [OsppErrorCode.OUTCOME_INDETERMINATE]:
    'Station: report the bay `Faulted` and emit the SecurityEvent [MSG-012] that carries the `sessionId`. Server: settle on the estimate, and record that the closing figure is unmeasured rather than observed. Operator: inspect the bay before returning it to service.',

  // 07-errors.md §3.6 — Server (6xxx)
  [OsppErrorCode.SERVER_GENERIC]:
    'Retry after 5 seconds. If persistent, contact support.',
  [OsppErrorCode.SERVER_INTERNAL_ERROR]:
    'Retry with exponential backoff. Server: log full error with request context, correlate via `X-Request-Id`.',
  [OsppErrorCode.ACK_TIMEOUT]:
    'Server: refund 100% if this was a StartService. App: show "Station did not respond" with retry option. Server: check station heartbeat status.',
  [OsppErrorCode.STATION_OFFLINE]:
    'App: show "Station is offline" message. Suggest trying again later or using BLE offline mode if available.',
  [OsppErrorCode.VALIDATION_ERROR]:
    'Fix the request body per the API schema. The `details` field contains per-field validation errors.',
  [OsppErrorCode.SESSION_ALREADY_ACTIVE]:
    'App: show the existing active session. The user must stop or wait for the current session before starting a new one.',
  [OsppErrorCode.RATE_LIMIT_EXCEEDED]:
    'Wait before retrying. The `Retry-After` HTTP header (if present) indicates when to retry. See Chapter 06 §7.1 for rate limit thresholds.',
  [OsppErrorCode.SERVICE_DEGRADED]:
    'Non-blocking. The server continues to function with reduced capabilities. Degraded features are listed in the `details` field.',
  [OsppErrorCode.COMMAND_PRE_EMPTED]:
    'Operator: read `details.reason` — it says which kind of pre-empt this is. If `details.wouldBe` is present, treat it as that code\'s row directs; where it disagrees with the station, the server\'s view is stale — reconcile the server, do not visit the station. If absent, the command did not run and no outcome may be assumed; re-issue once the named condition clears. Server: always carry `details.reason`; carry `details.wouldBe` only for a predicted refusal; never pre-empt a forced command.',
};

/**
 * The corrective action for a registry code.
 *
 * Total over `OsppErrorCode`: every one of the 118 registry codes has an entry,
 * which is what `check:recommended-action` enforces. The signature is therefore
 * `string` and not `string | undefined` — a caller emitting the REST Error
 * Object (§2.4), where `recommendedAction` is REQUIRED, never has to decide what
 * to do with an absent value.
 *
 * A code outside the enum is a programming error rather than a wire condition,
 * and is answered with a throw rather than a placeholder: §1.4 forbids
 * substituting a generic string, and an invented one is exactly that.
 */
export function recommendedAction(code: OsppErrorCode): string {
  const action = RECOMMENDED_ACTION[code];
  if (action === undefined) {
    throw new RangeError(`No recommendedAction for error code ${String(code)} — not an OSPP registry code`);
  }
  return action;
}
