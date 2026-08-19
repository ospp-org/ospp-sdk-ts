import type { FirmwareNotificationStatus } from '../../state-machines/FirmwareStateMachine.js';

export type { FirmwareNotificationStatus };

/**
 * FirmwareStatusNotification EVENT — Station → Server.
 *
 * `progress` and `errorText` are optional HERE because each is present on some
 * statuses and forbidden on others — the shape is conditional on `status`, and a
 * flat interface cannot say that. The conditions themselves are enforced by
 * `firmware-status-notification.schema.json`, which is what validates the wire.
 * This mirrors `DiagnosticsNotificationPayload`, whose twin conditions landed in
 * `0.23.0`; neither type invents a form the other does not have.
 */
export interface FirmwareStatusNotificationPayload {
  status: FirmwareNotificationStatus;
  firmwareVersion: string;
  /**
   * Download or install progress, 0--100.
   *
   * Two of the five statuses carry it — `Downloading` at every 10% increment and
   * `Installing` at four milestones (`firmware-status.md` §5 rules 1--2). It
   * **MUST be absent** on `Downloaded`, `Installed` and `Failed`, and the schema
   * enforces that with `{"progress": false}` on those three since spec `v0.25.0`.
   *
   * Until then rule 3 read *"MUST be omitted **or set to `0`**"* and the schema
   * carried no conditional at all. `0` and absent were never distinguishable in
   * meaning, only in bytes, so the pair was a divergence generator with no
   * expressive gain: a server had to normalise both and a station could pick
   * either. One spelling now, the same one the diagnostics twin has always had.
   */
  progress?: number;
  /**
   * Human-readable failure description, max 128 characters.
   *
   * **REQUIRED on `Failed`, forbidden on the other four**, and the schema enforces
   * both halves since spec `v0.25.0`. Rule 4 had demanded it on `Failed` while the
   * schema neither required it there nor forbade it anywhere else — so the field
   * was a free-text slot on a success, in the server column that also holds real
   * failure text.
   */
  errorText?: string;
}
