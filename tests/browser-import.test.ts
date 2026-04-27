import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BayStatus,
  MessageType,
  MessageSource,
  OsppAction,
  OSPP_PROTOCOL_VERSION,
  createEnvelope,
  toServerTopic,
  canonicalize,
} from '../src/index';

describe('browser-safe barrel — runtime sanity', () => {
  it('exposes enum string values without evaluating Node-only modules', () => {
    expect(BayStatus.AVAILABLE).toBe('Available');
    expect(MessageType.REQUEST).toBe('Request');
    expect(MessageSource.STATION).toBe('Station');
    expect(OsppAction.BOOT_NOTIFICATION).toBe('BootNotification');
    expect(OSPP_PROTOCOL_VERSION).toBe('0.2.1');
  });

  it('createEnvelope and topic helpers are pure-JS callable', () => {
    const env = createEnvelope({
      messageId: 'hb_1',
      messageType: MessageType.REQUEST,
      action: OsppAction.HEARTBEAT,
      source: MessageSource.STATION,
      payload: {},
    });
    expect(env.action).toBe('Heartbeat');
    expect(env.protocolVersion).toBe('0.2.1');
    expect(toServerTopic('STN-001')).toBe('ospp/v1/stations/STN-001/to-server');
    expect(canonicalize({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });
});

describe('built dist/index.js — transitive import graph stays browser-safe', () => {
  it('contains no Node-only imports across the full graph reachable from index.js', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const distRoot = resolve(here, '..', 'dist');
    const entry = join(distRoot, 'index.js');

    const visited = new Set<string>();
    const queue: string[] = [entry];
    const offenders: { file: string; match: string }[] = [];

    const nodeImportRe = /from ['"](node:[^'"]+|fs|path|os|crypto)['"]|__dirname|require\(['"](?:fs|path|crypto|node:[^'"]+)['"]\)/;
    const relImportRe = /from ['"](\.{1,2}\/[^'"]+\.js)['"]/g;

    while (queue.length > 0) {
      const file = queue.pop()!;
      if (visited.has(file)) continue;
      visited.add(file);

      const text = readFileSync(file, 'utf-8');
      const m = text.match(nodeImportRe);
      if (m) offenders.push({ file, match: m[0] });

      for (const ref of text.matchAll(relImportRe)) {
        const target = resolve(dirname(file), ref[1]);
        queue.push(target);
      }
    }

    expect(offenders).toEqual([]);
    expect(visited.size).toBeGreaterThan(10);
  });
});
