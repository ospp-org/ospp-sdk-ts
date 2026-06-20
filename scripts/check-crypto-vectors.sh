#!/usr/bin/env bash
# Verify that the vendored BLE crypto conformance corpus is byte-identical to the
# spec source at the ref pinned in .spec-ref. Local mirror of the CI gate — the
# crypto-corpus twin of scripts/check-schemas.sh.
#
# Vendored files (tests/crypto/fixtures/) <- spec source:
#   ble-handshake-keyschedule.json  <-  conformance/test-vectors/crypto/
#   rfc-primitive-anchors.json      <-  conformance/test-vectors/crypto/
#   server-test-pub.pem             <-  conformance/test-keys/
#
# NOTE: the BLE crypto corpus exists only in spec >= v0.6.0. Until .spec-ref is
# bumped to a v0.6.0+ tag AND that tag is pushed to ospp-org/spec, run this gate
# in local mode against a v0.6.0 checkout:
#   SPEC_REPO=/path/to/spec scripts/check-crypto-vectors.sh
#
# Usage:
#   scripts/check-crypto-vectors.sh                       # clones spec at .spec-ref
#   SPEC_REPO=/local/path scripts/check-crypto-vectors.sh # diffs a local checkout
#
# Exit: 0 if byte-identical, 1 otherwise.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC_REF="$(tr -d '[:space:]' < "${REPO_ROOT}/.spec-ref")"
FIXTURES="${REPO_ROOT}/tests/crypto/fixtures"

if [[ -n "${SPEC_REPO:-}" ]]; then
  SPEC_SRC="${SPEC_REPO}"
  echo "Comparing against local spec checkout at ${SPEC_REPO} (.spec-ref=${SPEC_REF} — not enforced for local mode)"
else
  TMPDIR="$(mktemp -d)"
  trap 'rm -rf "${TMPDIR}"' EXIT
  echo "Cloning ospp-org/spec at ${SPEC_REF}..."
  git clone --quiet --depth 1 --branch "${SPEC_REF}" https://github.com/ospp-org/spec.git "${TMPDIR}/spec"
  SPEC_SRC="${TMPDIR}/spec"
fi

CRYPTO_SRC="${SPEC_SRC}/conformance/test-vectors/crypto"
KEYS_SRC="${SPEC_SRC}/conformance/test-keys"

if [[ ! -d "${CRYPTO_SRC}" ]]; then
  echo "ERROR: ${CRYPTO_SRC} not found — the BLE crypto corpus exists only in spec >= v0.6.0." >&2
  echo "       Bump .spec-ref to a v0.6.0+ tag (and push that tag to ospp-org/spec), or run in" >&2
  echo "       local mode: SPEC_REPO=/path/to/spec scripts/check-crypto-vectors.sh" >&2
  exit 1
fi

status=0
check() {
  local src="$1" dst="$2" name="$3"
  if [[ ! -f "${src}" ]]; then echo "DRIFT: missing in spec source: ${name}" >&2; status=1; return; fi
  if [[ ! -f "${dst}" ]]; then echo "DRIFT: missing vendored copy: ${name}" >&2; status=1; return; fi
  if cmp -s "${src}" "${dst}"; then
    echo "OK identical: ${name}"
  else
    echo "DRIFT: ${name} differs from spec ${SPEC_REF}" >&2
    status=1
  fi
}

check "${CRYPTO_SRC}/ble-handshake-keyschedule.json" "${FIXTURES}/ble-handshake-keyschedule.json" "ble-handshake-keyschedule.json"
check "${CRYPTO_SRC}/rfc-primitive-anchors.json"      "${FIXTURES}/rfc-primitive-anchors.json"      "rfc-primitive-anchors.json"
check "${KEYS_SRC}/server-test-pub.pem"               "${FIXTURES}/server-test-pub.pem"             "server-test-pub.pem"

if [[ "${status}" -eq 0 ]]; then
  echo "OK — vendored BLE crypto corpus byte-identical to spec ${SPEC_REF}"
else
  echo "" >&2
  echo "Fix: re-vendor from spec conformance/test-vectors/crypto/ + test-keys/server-test-pub.pem" >&2
  echo "into tests/crypto/fixtures/ (cp) and re-commit. Do not edit vendored vectors in place." >&2
fi
exit "${status}"
