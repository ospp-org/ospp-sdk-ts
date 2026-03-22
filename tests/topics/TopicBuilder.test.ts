import { describe, it, expect } from 'vitest';
import {
  toServerTopic,
  toStationTopic,
  SERVER_WILDCARD_TOPIC,
  serverSharedTopic,
  extractStationId,
} from '../../src/topics/TopicBuilder';

const STATION_ID = 'stn_a1b2c3d4';

describe('toServerTopic', () => {
  it('should build Station → Server topic', () => {
    expect(toServerTopic(STATION_ID)).toBe('ospp/v1/stations/stn_a1b2c3d4/to-server');
  });
});

describe('toStationTopic', () => {
  it('should build Server → Station topic', () => {
    expect(toStationTopic(STATION_ID)).toBe('ospp/v1/stations/stn_a1b2c3d4/to-station');
  });
});

describe('SERVER_WILDCARD_TOPIC', () => {
  it('should use + wildcard for all stations', () => {
    expect(SERVER_WILDCARD_TOPIC).toBe('ospp/v1/stations/+/to-server');
  });
});

describe('serverSharedTopic', () => {
  it('should default to ospp-servers group', () => {
    expect(serverSharedTopic()).toBe('$share/ospp-servers/ospp/v1/stations/+/to-server');
  });

  it('should accept a custom group name', () => {
    expect(serverSharedTopic('my-group')).toBe('$share/my-group/ospp/v1/stations/+/to-server');
  });
});

describe('extractStationId', () => {
  it('should extract from to-server topic', () => {
    expect(extractStationId('ospp/v1/stations/stn_a1b2c3d4/to-server')).toBe('stn_a1b2c3d4');
  });

  it('should extract from to-station topic', () => {
    expect(extractStationId('ospp/v1/stations/stn_xyz99887766/to-station')).toBe('stn_xyz99887766');
  });

  it('should extract from shared subscription topic', () => {
    expect(extractStationId('$share/ospp-servers/ospp/v1/stations/stn_a1b2c3d4/to-server')).toBe('stn_a1b2c3d4');
  });

  it('should extract from custom shared group', () => {
    expect(extractStationId('$share/my-group/ospp/v1/stations/stn_a1b2c3d4/to-server')).toBe('stn_a1b2c3d4');
  });

  it('should return undefined for invalid topic', () => {
    expect(extractStationId('some/other/topic')).toBeUndefined();
  });

  it('should return undefined for wrong prefix', () => {
    expect(extractStationId('mqtt/v1/stations/stn_a1b2c3d4/to-server')).toBeUndefined();
  });

  it('should return undefined for wrong suffix', () => {
    expect(extractStationId('ospp/v1/stations/stn_a1b2c3d4/to-client')).toBeUndefined();
  });

  it('should return undefined for too few segments', () => {
    expect(extractStationId('ospp/v1/stations/stn_a1b2c3d4')).toBeUndefined();
  });

  it('should return undefined for too many segments', () => {
    expect(extractStationId('ospp/v1/stations/stn_a1b2c3d4/to-server/extra')).toBeUndefined();
  });
});

describe('topic roundtrip', () => {
  it('should extract the stationId from a built to-server topic', () => {
    const topic = toServerTopic('stn_deadbeef01');
    expect(extractStationId(topic)).toBe('stn_deadbeef01');
  });

  it('should extract the stationId from a built to-station topic', () => {
    const topic = toStationTopic('stn_cafebabe02');
    expect(extractStationId(topic)).toBe('stn_cafebabe02');
  });
});
