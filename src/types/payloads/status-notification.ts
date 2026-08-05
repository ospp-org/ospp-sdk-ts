import type { BayId } from '../common.js';
import type { ProgramStatus } from '../topology.js';
import type { ReportableBayStatus } from '../../enums/BayStatus.js';

/**
 * StatusNotification EVENT — Station → Server.
 *
 * Reports the bay's PROGRAMS, not its services. A program is a physical
 * operation the hardware performs and its ordinal is a firmware constant the
 * station always knows; a service is a commercial offer the SERVER mints and
 * pushes in the catalog. A station cannot originate knowledge of a service,
 * only echo one back — and immediately after its first boot it has been told
 * none, so the old shape required at least one `svc_`-prefixed identifier in
 * the very message CORE-004 requires at that exact moment. A conforming first
 * boot was impossible.
 */
export interface StatusNotificationPayload {
  bayId: BayId;
  /**
   * As the station declared it. Its correspondence to `bayId` is supplied
   * EXPLICITLY by the `bays` array in the provisioning response, whose members
   * pair the two. That is the only place the mapping is supplied. Bay numbers
   * need NOT be dense.
   */
  bayNumber: number;
  status: ReportableBayStatus;
  /**
   * Present when this report's `status` differs from the last reported for the
   * bay, omitted otherwise. Two cases omit it, and they are the only two:
   *
   * - The post-boot report. The station is leaving `Unknown`, which this field
   *   cannot carry, so there is nothing truthful to put there.
   * - A program-only report. The bay's status did not change, so there is no
   *   transition to name; writing `status` into `previousStatus` would assert
   *   an `X → X` the canonical table does not contain.
   *
   * Its absence means "this report is not a bay transition".
   */
  previousStatus?: ReportableBayStatus;
  /**
   * One entry per program this bay declared at provisioning, 1..32.
   *
   * The SET of programNumbers MUST equal the set this bay declared in the
   * BootNotification topology for the same bayNumber: a program that cannot run
   * is reported present-but-unavailable, NEVER omitted, because omission means
   * the hardware changed and that requires re-provisioning.
   *
   * Reported on EVERY StatusNotification, not only on a bay transition.
   */
  programs: ProgramStatus[];
  /** Bay-level. REQUIRED when `status` is `Faulted`, from the 5xxx range. */
  errorCode?: number;
  /** Bay-level, UPPER_SNAKE_CASE. REQUIRED when `status` is `Faulted`. */
  errorText?: string;
}
