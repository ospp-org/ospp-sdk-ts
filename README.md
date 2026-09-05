# @ospp/protocol

TypeScript SDK for the OSPP (Open Self-Service Point Protocol), pinned to spec `v0.31.0`.

## Install

```bash
npm install @ospp/protocol
```

## What's included

- **27 MQTT actions** with full TypeScript types for all request/response/event payloads
- **118 error codes** with severity, recoverable, and HTTP status metadata
- **29 configuration keys** with type, access mode, mutability, and default values
- **6 state machines** (Station, Bay, Session, Reservation, Firmware, Diagnostics) with enforced transitions
- **HMAC-SHA256** canonical JSON serialization, signing, and timing-safe verification
- **ECDSA P-256** signing and verification
- **HMAC signing classification** per (action, messageType) with Critical/All/None modes
- **JSON Schema validation** (Ajv Draft 2020-12) with 86 bundled schemas
- **MQTT topic builders** with shared subscription support

## Usage

```typescript
import {
  OsppAction,
  createEnvelope,
  MessageType,
  MessageSource,
  SchemaValidator,
  BayStateMachine,
  computeMac,
  verifyMac,
  requiresHmac,
  toServerTopic,
} from '@ospp/protocol';
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## License

See LICENSE file.
