/**
 * The station's physical topology: its bays, and per bay the programs that bay
 * can run.
 *
 * `BayTopology` is the unit the station re-declares in every BootNotification
 * (`bays[]`) and the unit the server echoes in a `3018 TOPOLOGY_MISMATCH`
 * `details` object — one definition, not two copies
 * (spec schemas/common/bay-topology.schema.json).
 *
 * **Labels are not part of it.** They are declared once, at provisioning, so an
 * operator can tell which physical program is which when building the service
 * bindings. They are descriptive and are never compared: a corrected typo in a
 * firmware constant MUST NOT put a station into `Pending`.
 *
 * **Programs are physical and station-owned; services are commercial and
 * server-minted.** A program is a complete station-defined operation ("simple
 * wash"), identified within its bay by `programNumber`. It is not a composable
 * element — "brush" and "water" are not programs. The binding between a service
 * and a program is created on the SERVER by an operator; the station never
 * originates it (01-architecture.md §4.2).
 */

/** 01-architecture.md §4.2: "MUST NOT exceed **64**". */
export const MAX_BAYS_PER_STATION = 64;

/** 01-architecture.md §4.2: "The maximum number of programs per bay MUST NOT exceed **32**." */
export const MAX_PROGRAMS_PER_BAY = 32;

/**
 * One bay, as re-declared at boot: its ordinal and its program ordinals.
 *
 * Neither set need be dense: a station whose bay 2 was never fitted declares
 * `{1, 3}` and asserts nothing about a bay 2, and a server MUST NOT reject a
 * declaration for being non-dense. `programNumbers` is compared as a SET —
 * order carries no meaning.
 */
export interface BayTopology {
  /** 1..64. Unique within the message. The set need NOT be dense. */
  bayNumber: number;
  /** 1..32 each, 1..32 of them, unique. Compared as a set. */
  programNumbers: number[];
}

/**
 * One program of a bay, as declared at PROVISIONING — where the label is
 * carried, because that is the moment an operator needs it to build the service
 * bindings. Boot re-declares the ordinals only.
 */
export interface ProgramDeclaration {
  programNumber: number;
  /** Printable ASCII, 1..32 chars, unique within its bay. Descriptive; never compared at boot. */
  label: string;
}

/** One bay, as declared at PROVISIONING: ordinals plus labels. */
export interface BayDeclaration {
  bayNumber: number;
  programs: ProgramDeclaration[];
}

/**
 * The server's answer for one bay: the identifier it assigned, paired
 * EXPLICITLY with the number the station declared.
 *
 * "Carrying the pair as an object rather than by array position is what lets a
 * non-dense bay set be expressed at all: a station with bays {1,3} receives two
 * objects naming 1 and 3, where a positional array would have had to invent a
 * bay 2 to reach index 2." Order is NOT significant, and a station MUST NOT
 * infer anything from the sequence.
 */
export interface BayAssignment {
  bayId: string;
  bayNumber: number;
}

/**
 * Where a commercial service physically runs. Created on the server by an
 * operator and delivered to the station in the catalog; the station never
 * originates one.
 *
 * This is what lets the station act OFFLINE, where no StartService command
 * exists to carry the ordinal — a BLE start request names a `serviceId`, and
 * this is the only mapping from that to a physical program.
 */
export interface ServiceBinding {
  bayNumber: number;
  programNumber: number;
}

/**
 * One program's availability, as reported in a StatusNotification.
 *
 * The SET of `programNumber` values MUST equal the set this bay declared for
 * the same `bayNumber` in its BootNotification topology. A program that cannot
 * run is reported present with `available: false`, NEVER omitted — omission
 * means the hardware changed, and that requires re-provisioning, not a status
 * report (CORE-013).
 */
export interface ProgramStatus {
  programNumber: number;
  available: boolean;
  /**
   * OPTIONAL, and present only when `available` is false. Without it an
   * operator sees a dead program and cannot tell a blown fuse from a failed
   * sensor: two faults, one truck roll, the wrong tools.
   *
   * Distinct from the bay-level `errorCode`: a bay may be `Available` overall
   * while one of its programs is not.
   */
  errorCode?: number;
  /** OPTIONAL. Accompanies `errorCode` whenever that is present. */
  errorText?: string;
}

/**
 * Compare two program-ordinal sets the way the server does — as SETS.
 *
 * A station that re-orders its declaration between boots has not changed its
 * hardware, and must not be held out of service for it.
 */
export function sameProgramSet(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((v, i) => v === sortedB[i]);
}

/**
 * Does a declared topology match a provisioned one?
 *
 * 05-state-machines.md §1.5: "The server compares that declaration, as a set in
 * both directions, against the topology recorded for the station at
 * provisioning. [...] The mismatch is symmetric: a bay or a program ordinal
 * present on one side and absent on the other is a mismatch in either
 * direction."
 */
export function topologyMatches(
  expected: readonly BayTopology[],
  declared: readonly BayTopology[],
): boolean {
  if (expected.length !== declared.length) return false;

  const byNumber = new Map(declared.map((b) => [b.bayNumber, b]));

  for (const bay of expected) {
    const other = byNumber.get(bay.bayNumber);
    if (other === undefined) return false;
    if (!sameProgramSet(bay.programNumbers, other.programNumbers)) return false;
  }

  return true;
}
