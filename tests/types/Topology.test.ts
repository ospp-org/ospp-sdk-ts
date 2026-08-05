/**
 * Topology and programs — the station declares its bays and their programs.
 *
 * Mirrored by ospp-sdk-php tests/Contract/ValueObjects/TopologyContractTest.php.
 *
 * The types here are asserted against the VENDORED SCHEMAS rather than against
 * a transcription of them, so a type that drifts from the wire fails rather
 * than agreeing with a stale copy of it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MAX_BAYS_PER_STATION,
  MAX_PROGRAMS_PER_BAY,
  sameProgramSet,
  topologyMatches,
  type BayTopology,
} from '../../src/types/topology';
import type { BootNotificationRequest } from '../../src/types/payloads/boot-notification';
import type { StatusNotificationPayload } from '../../src/types/payloads/status-notification';
import type { StartServiceRequest } from '../../src/types/payloads/start-service';
import type { ServiceItem } from '../../src/types/common';

const SCHEMAS = join(__dirname, '..', '..', 'src', 'schemas');
const schema = (rel: string) => JSON.parse(readFileSync(join(SCHEMAS, rel), 'utf-8'));

describe('bounds', () => {
  /**
   * 01-architecture.md §4.2: "The maximum number of bays per controller is
   * implementation-defined but MUST NOT exceed **64**." and "The maximum number
   * of programs per bay MUST NOT exceed **32**."
   */
  it('is 64 bays and 32 programs, matching bay-topology.schema.json', () => {
    const bayTopology = schema('common/bay-topology.schema.json');

    expect(MAX_BAYS_PER_STATION).toBe(64);
    expect(MAX_PROGRAMS_PER_BAY).toBe(32);

    expect(bayTopology.properties.bayNumber.maximum).toBe(MAX_BAYS_PER_STATION);
    expect(bayTopology.properties.programNumbers.maxItems).toBe(MAX_PROGRAMS_PER_BAY);
    expect(bayTopology.properties.programNumbers.items.maximum).toBe(MAX_PROGRAMS_PER_BAY);
  });
});

describe('BootNotification declares bays[], not bayCount', () => {
  /**
   * boot-notification.md §3: "`bays` | array | Yes | The station's re-declared
   * physical topology: one entry per bay, each carrying `bayNumber` and the
   * `programNumbers` that bay can run."
   */
  it('carries bays[] of {bayNumber, programNumbers}', () => {
    const req: BootNotificationRequest = {
      stationId: 'stn_a1b2c3d4e5f6',
      firmwareVersion: '1.2.3',
      stationModel: 'SSP-3000',
      stationVendor: 'AcmeCorp',
      serialNumber: 'ACME-SSP-20250187',
      bays: [
        { bayNumber: 1, programNumbers: [1, 2, 3] },
        // Non-dense is legal everywhere, and a server MUST NOT reject a
        // declaration for being non-dense.
        { bayNumber: 3, programNumbers: [1] },
      ],
      uptimeSeconds: 42,
      pendingOfflineTransactions: 0,
      timezone: 'Europe/London',
      bootReason: 'PowerOn' as BootNotificationRequest['bootReason'],
      capabilities: { bleSupported: true, offlineModeSupported: true, meterValuesSupported: true },
      networkInfo: { connectionType: 'Ethernet', signalStrength: null },
    };

    expect(req.bays).toHaveLength(2);
    expect(req.bays[1].bayNumber).toBe(3);
  });

  it('has no bayCount, in the type or the schema', () => {
    const req = schema('mqtt/boot-notification-request.schema.json');

    expect(req.required).toContain('bays');
    expect(req.required).not.toContain('bayCount');
    expect(Object.keys(req.properties)).not.toContain('bayCount');
  });
});

describe('StatusNotification reports programs[], not services[]', () => {
  /**
   * status-notification.md §3: "`programs` | array<object> | Yes | Program
   * availability list, one entry per program this bay declared at provisioning."
   *
   * "A station cannot originate knowledge of a service, only echo one back, and
   * immediately after its first boot it has been told none — so the old shape
   * required at least one `svc_`-prefixed identifier in the very message
   * CORE-004 requires at that exact moment. A conforming first boot was
   * impossible."
   */
  it('carries programs[] of {programNumber, available}', () => {
    const evt: StatusNotificationPayload = {
      bayId: 'bay_c1d2e3f4a5b6',
      bayNumber: 1,
      status: 'Available' as StatusNotificationPayload['status'],
      programs: [
        { programNumber: 1, available: true },
        // An unusable program is reported present-but-unavailable, never
        // omitted: omission means the hardware changed (CORE-013).
        { programNumber: 2, available: false, errorCode: 5002, errorText: 'FLUID_SYSTEM' },
      ],
    };

    expect(evt.programs).toHaveLength(2);
    expect(evt.programs[1].available).toBe(false);
    expect(evt.programs[1].errorCode).toBe(5002);
  });

  it('has no services[], in the type or the schema', () => {
    const s = schema('mqtt/status-notification.schema.json');

    expect(s.required).toContain('programs');
    expect(s.required).not.toContain('services');
    expect(Object.keys(s.properties)).not.toContain('services');
  });
});

describe('programNumber travels in StartService and in the catalog', () => {
  /**
   * start-service-request.schema.json: "The ordinal of the PHYSICAL PROGRAM to
   * run on the target bay [...] Carried explicitly so the station acts on a
   * field rather than indexing its own catalog by serviceId, and so a service
   * minted since the last catalog push still starts."
   */
  it('is required on StartService', () => {
    const req: StartServiceRequest = {
      sessionId: 'sess_a1b2c3d4',
      bayId: 'bay_c1d2e3f4a5b6',
      serviceId: 'svc_eco',
      programNumber: 2,
      durationSeconds: 300,
      sessionSource: 'MobileApp' as StartServiceRequest['sessionSource'],
    };

    expect(req.programNumber).toBe(2);
    expect(schema('mqtt/start-service-request.schema.json').required).toContain('programNumber');
  });

  /**
   * service-item.schema.json: "`bindings` [...] Where this commercial service
   * physically runs: one entry per (bay, program) pair it is bound to. [...]
   * This is what lets the station act OFFLINE, where no StartService command
   * exists to carry the ordinal."
   */
  it('is required in the catalog, as bindings[]', () => {
    const item: ServiceItem = {
      serviceId: 'svc_eco',
      serviceName: 'Eco Wash',
      pricingType: 'Fixed',
      priceCreditsFixed: 100,
      available: true,
      bindings: [{ bayNumber: 1, programNumber: 2 }],
    };

    expect(item.bindings[0].programNumber).toBe(2);
    expect(schema('common/service-item.schema.json').required).toContain('bindings');
  });
});

describe('the provisioning response pairs bayId with bayNumber explicitly', () => {
  /**
   * provisioning-response.schema.json: "Server-assigned bay identifiers, each
   * paired EXPLICITLY with the bayNumber the station declared for it. [...]
   * Carrying the pair as an object rather than by array position is what lets a
   * non-dense bay set be expressed at all: a station with bays {1,3} receives
   * two objects naming 1 and 3, where a positional array would have had to
   * invent a bay 2 to reach index 2."
   */
  it('has bays[] of {bayId, bayNumber} and no positional bayIds', () => {
    const res = schema('provisioning-response.schema.json');

    expect(res.required).toContain('bays');
    expect(res.required).not.toContain('bayIds');
    expect(Object.keys(res.properties)).not.toContain('bayIds');
    expect(res.properties.bays.items.required.sort()).toEqual(['bayId', 'bayNumber']);
    expect(res.properties.bays.maxItems).toBe(MAX_BAYS_PER_STATION);
  });
});

describe('BayTopology is the shared shape', () => {
  /**
   * bay-topology.schema.json is referenced by BOTH the request's bays[] and the
   * 3018 response's details.expected/declared — "one definition instead of two
   * copies".
   */
  it('is what the 3018 details object is typed against', () => {
    const res = schema('mqtt/boot-notification-response.schema.json');
    const ref = '../common/bay-topology.schema.json';

    expect(res.properties.details.properties.expected.items.$ref).toBe(ref);
    expect(res.properties.details.properties.declared.items.$ref).toBe(ref);
    expect(schema('mqtt/boot-notification-request.schema.json').properties.bays.items.$ref).toBe(
      ref,
    );
  });

  it('compares programNumbers as a set, so order carries no meaning', () => {
    const a: BayTopology = { bayNumber: 1, programNumbers: [1, 2, 3] };
    const b: BayTopology = { bayNumber: 1, programNumbers: [3, 1, 2] };

    // The server "compares this as a SET" (bay-topology.schema.json).
    expect([...a.programNumbers].sort()).toEqual([...b.programNumbers].sort());
  });
});

describe('topology comparison', () => {
  /**
   * 05-state-machines.md §1.5: "The mismatch is symmetric: a bay or a program
   * ordinal present on one side and absent on the other is a mismatch in either
   * direction."
   */
  it('is symmetric and set-based', () => {
    const provisioned: BayTopology[] = [
      { bayNumber: 1, programNumbers: [1, 2, 3] },
      { bayNumber: 3, programNumbers: [1] },
    ];

    // Re-ordered, same hardware.
    expect(
      topologyMatches(provisioned, [
        { bayNumber: 3, programNumbers: [1] },
        { bayNumber: 1, programNumbers: [3, 2, 1] },
      ]),
    ).toBe(true);

    // A bay present only in the declaration.
    expect(
      topologyMatches(provisioned, [
        { bayNumber: 1, programNumbers: [1, 2, 3] },
        { bayNumber: 3, programNumbers: [1] },
        { bayNumber: 4, programNumbers: [1] },
      ]),
    ).toBe(false);

    // A bay present only in the provisioned record.
    expect(topologyMatches(provisioned, [{ bayNumber: 1, programNumbers: [1, 2, 3] }])).toBe(false);

    // A program ordinal present on one side only.
    expect(
      topologyMatches(provisioned, [
        { bayNumber: 1, programNumbers: [1, 2] },
        { bayNumber: 3, programNumbers: [1] },
      ]),
    ).toBe(false);
  });

  it('ignores program order', () => {
    expect(sameProgramSet([1, 2, 3], [3, 1, 2])).toBe(true);
    expect(sameProgramSet([1, 2, 3], [1, 2])).toBe(false);
  });
});
