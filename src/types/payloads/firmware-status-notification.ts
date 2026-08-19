import type { FirmwareNotificationStatus } from '../../state-machines/FirmwareStateMachine.js';

export type { FirmwareNotificationStatus };

/** FirmwareStatusNotification EVENT — Station → Server. */
export interface FirmwareStatusNotificationPayload {
  status: FirmwareNotificationStatus;
  firmwareVersion: string;
  /**
   * Download or install progress, 0--100.
   *
   * Two of the five statuses carry it — `Downloading` at every 10% increment and
   * `Installing` at four milestones (`firmware-status.md` §5 rules 1--2). Optional
   * here because the schema leaves it unconstrained on all five; §5 rule 3's
   * "omitted or set to `0`" for `Downloaded`, `Installed` and `Failed` is prose
   * only, and it admits two spellings of the same absence where the diagnostics
   * twin admits one.
   */
  progress?: number;
  /**
   * Human-readable failure description.
   *
   * `firmware-status.md` §5 rule 4 makes it a MUST on `Failed`, but the schema does
   * not require it there and does not forbid it elsewhere — so this is `?` because
   * the wire contract says so, not because a `Failed` without it is conforming.
   * The diagnostics twin has both halves schema-enforced (`diagnostics-status.md`
   * §5 rule 5).
   */
  errorText?: string;
}
