/**
 * `bootReason` gains two values, and Reset loses its type union entirely.
 *
 * Mirrored by ospp-sdk-php tests/Contract/Enums/BootReasonAndResetContractTest.php.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BootReason, bootReasonNamesAnActualBoot } from '../../src/enums/BootReason';

describe('bootReason', () => {
  /**
   * boot-notification.md §3: "One of: `PowerOn`, `Watchdog`, `FirmwareUpdate`,
   * `RemoteReset`, `ManualReset`, `ScheduledReset`, `ErrorRecovery`,
   * `Reconnect`. The first seven name an actual boot; `Reconnect` says none
   * occurred."
   */
  it('has the eight spec values in spec order', () => {
    expect(Object.values(BootReason)).toEqual([
      'PowerOn',
      'Watchdog',
      'FirmwareUpdate',
      'RemoteReset',
      'ManualReset',
      'ScheduledReset',
      'ErrorRecovery',
      'Reconnect',
    ]);
  });

  /**
   * reset.md §5 rule 6: after restarting the station "MUST send a
   * BootNotification with `bootReason: "RemoteReset"` — the value that says the
   * server asked for this return, distinguishing it from a spontaneous one."
   */
  it('has RemoteReset', () => {
    expect(BootReason.REMOTE_RESET).toBe('RemoteReset');
  });

  /**
   * boot-notification.md §5.2: "`Reconnect` is the value for that case, and it
   * is the only member that does not name a boot."
   */
  it('treats Reconnect as the only member that does not name a boot', () => {
    expect(bootReasonNamesAnActualBoot(BootReason.RECONNECT)).toBe(false);

    for (const reason of Object.values(BootReason)) {
      if (reason !== BootReason.RECONNECT) {
        expect(bootReasonNamesAnActualBoot(reason), `${reason} names an actual boot`).toBe(true);
      }
    }
  });

  it('matches the vendored schema enum exactly', () => {
    const schema = JSON.parse(
      readFileSync(
        join(__dirname, '..', '..', 'src', 'schemas', 'mqtt', 'boot-notification-request.schema.json'),
        'utf-8',
      ),
    );
    expect(schema.properties.bootReason.enum).toEqual(Object.values(BootReason));
  });
});

describe('Reset', () => {
  /**
   * "`Hard`/`Soft` are gone. One reboot operation remains, carrying an optional
   * `force`." The union that carried them is deleted, not narrowed — there is no
   * remaining value for it to hold.
   */
  it('no longer exports a ResetType', async () => {
    const mod = await import('../../src/index.js');
    expect('ResetType' in mod).toBe(false);
  });

  it('has a reset-request schema whose only property is force', () => {
    const schema = JSON.parse(
      readFileSync(
        join(__dirname, '..', '..', 'src', 'schemas', 'mqtt', 'reset-request.schema.json'),
        'utf-8',
      ),
    );
    expect(Object.keys(schema.properties)).toEqual(['force']);
    expect(schema.required).toEqual([]);
    expect(schema.properties.force.type).toBe('boolean');
    expect(schema.properties.force.default).toBe(false);
  });
});
