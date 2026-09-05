/**
 * Bay State Machine — 7 states, governs bay operational status.
 *
 * Source: the canonical transition table, spec/05-state-machines.md §2.3.
 * "This is the canonical table. Nothing else in this specification restates it."
 *
 * Twenty `Station` rows by distinct (from, to) pair and six `Server` rows,
 * twenty-six in all. The split is the point: a station effects and reports the
 * physical transitions, a server infers the move to `Unknown` when it can no
 * longer hear the station. Which party a caller is asking about is therefore a
 * required argument, not a default — see {@link EffectedBy}.
 *
 * Initial state: Unknown (power-on / reboot).
 * Any transition not listed is invalid and MUST NOT be performed.
 */

import { BayStatus } from '../enums/BayStatus.js';
import { EffectedBy } from '../enums/EffectedBy.js';

const { UNKNOWN, AVAILABLE, RESERVED, OCCUPIED, FINISHING, FAULTED, UNAVAILABLE } = BayStatus;

/**
 * The twenty-one `Station` rows. These are the complete set a station may effect and
 * therefore the complete set a StatusNotification [MSG-009] may report.
 *
 * `Unknown` has SIX exits. §2.3: a station that reboots mid-session MUST resume
 * that session, and on the boot that follows the bay is physically `Occupied`
 * (or `Finishing`, mid wind-down) and owes a post-boot report. With only the
 * three determinate-idle exits that station had no truthful report to send —
 * `Available` would free a bay running a paid session.
 *
 * `Unknown -> Reserved` is the sixth, and it was MISSING here until 0.31.0. Spec
 * 0.30.0 added the row together with a station-side MUST to persist a `Confirmed`
 * reservation durably, *for exactly this reason*. This SDK refused it,
 * ospp-sdk-php refused it, and the reference server delegates to them — so the one
 * truthful post-boot report was rejected in all three, and a station following the
 * guides reported `Available`, which resells a reserved bay. Nothing caught it
 * because the canonical table was TRANSCRIBED into a test rather than derived;
 * `scripts/check-bay-transitions.ts` now derives it.
 *
 * `Unavailable → Faulted` is here because a bay taken out of service can still
 * develop a fault, and a technician working on it is the most likely person to
 * find one. Forbidding it does not prevent the fault, only the report of it.
 */
const STATION_TRANSITIONS: ReadonlyMap<BayStatus, ReadonlySet<BayStatus>> = new Map<
  BayStatus,
  Set<BayStatus>
>([
  [UNKNOWN,     new Set([AVAILABLE, FAULTED, UNAVAILABLE, OCCUPIED, FINISHING, RESERVED])],
  [AVAILABLE,   new Set([RESERVED, OCCUPIED, FAULTED, UNAVAILABLE])],
  [RESERVED,    new Set([OCCUPIED, AVAILABLE, FAULTED])],
  [OCCUPIED,    new Set([FINISHING, FAULTED])],
  [FINISHING,   new Set([AVAILABLE, FAULTED])],
  [FAULTED,     new Set([AVAILABLE, UNAVAILABLE])],
  [UNAVAILABLE, new Set([AVAILABLE, FAULTED])],
]);

/**
 * The six `Server` rows — every state to `Unknown`, on connection loss.
 *
 * Inferred, never reported: no message carries these and a station MUST NOT
 * implement them. The server leaves `Unknown` on the next accepted
 * StatusNotification, not on being told about it.
 *
 * `Unknown → Unknown` is absent: the table contains no self-transition, and a
 * server already holding a bay at `Unknown` has nothing to infer.
 */
const SERVER_TRANSITIONS: ReadonlyMap<BayStatus, ReadonlySet<BayStatus>> = new Map<
  BayStatus,
  Set<BayStatus>
>([
  [AVAILABLE,   new Set([UNKNOWN])],
  [RESERVED,    new Set([UNKNOWN])],
  [OCCUPIED,    new Set([UNKNOWN])],
  [FINISHING,   new Set([UNKNOWN])],
  [FAULTED,     new Set([UNKNOWN])],
  [UNAVAILABLE, new Set([UNKNOWN])],
]);

/** The table as this party sees it: the Station twenty, plus the Server six for a server. */
function tableFor(effectedBy: EffectedBy): ReadonlyMap<BayStatus, ReadonlySet<BayStatus>> {
  if (effectedBy === EffectedBy.STATION) return STATION_TRANSITIONS;

  const merged = new Map<BayStatus, Set<BayStatus>>();
  for (const [from, targets] of STATION_TRANSITIONS) merged.set(from, new Set(targets));
  for (const [from, targets] of SERVER_TRANSITIONS) {
    const existing = merged.get(from) ?? new Set<BayStatus>();
    for (const to of targets) existing.add(to);
    merged.set(from, existing);
  }
  return merged;
}

const SERVER_TABLE = tableFor(EffectedBy.SERVER);

/**
 * May `effectedBy` move a bay from `from` to `to`?
 *
 * A station is held to the twenty `Station` rows. A server implements all
 * twenty-six — the station's rows included, because it must accept what a
 * station reports.
 */
export function canTransition(from: BayStatus, to: BayStatus, effectedBy: EffectedBy): boolean {
  const table = effectedBy === EffectedBy.STATION ? STATION_TRANSITIONS : SERVER_TABLE;
  return table.get(from)?.has(to) ?? false;
}

/** The states this party may move a bay to from `from`. */
export function allowedTransitions(from: BayStatus, effectedBy: EffectedBy): BayStatus[] {
  const table = effectedBy === EffectedBy.STATION ? STATION_TRANSITIONS : SERVER_TABLE;
  return [...(table.get(from) ?? [])];
}

/** Twenty for a station, twenty-six for a server. */
export function transitionCount(effectedBy: EffectedBy): number {
  const table = effectedBy === EffectedBy.STATION ? STATION_TRANSITIONS : SERVER_TABLE;
  let count = 0;
  for (const targets of table.values()) count += targets.size;
  return count;
}

export class BayStateMachine {
  private _state: BayStatus;
  private readonly _effectedBy: EffectedBy;

  /**
   * `effectedBy` says which half of §2.3 this instance is held to, and it is
   * required. A station machine that silently accepted the `Server` rows would
   * model the server's job — which is exactly the merge §2.3 exists to undo.
   */
  constructor(effectedBy: EffectedBy, initialState: BayStatus = BayStatus.UNKNOWN) {
    this._effectedBy = effectedBy;
    this._state = initialState;
  }

  get state(): BayStatus {
    return this._state;
  }

  get effectedBy(): EffectedBy {
    return this._effectedBy;
  }

  canTransitionTo(to: BayStatus): boolean {
    return canTransition(this._state, to, this._effectedBy);
  }

  transition(to: BayStatus): void {
    if (!this.canTransitionTo(to)) {
      throw new Error(
        `Invalid bay transition for ${this._effectedBy}: ${this._state} → ${to}`,
      );
    }
    this._state = to;
  }
}

export { STATION_TRANSITIONS as BAY_STATION_TRANSITIONS, SERVER_TRANSITIONS as BAY_SERVER_TRANSITIONS };
