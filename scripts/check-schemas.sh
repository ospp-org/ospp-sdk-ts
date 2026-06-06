#!/usr/bin/env bash
# Verify that vendored src/schemas/ are byte-identical to the spec
# source at the ref pinned in .spec-ref. Local mirror of the CI gate.
#
# Usage:
#   scripts/check-schemas.sh                  # diffs against pinned ref
#   SPEC_REPO=/local/path scripts/check-schemas.sh   # diffs against a local checkout
#
# Excludes:
#   - README.md           — non-schema documentation in spec/schemas/
#   - SchemaPath.ts       — sdk-ts-local Node helper (not in spec)
#
# Exit: 0 if byte-identical (modulo exclusions), 1 otherwise.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC_REF="$(cat "${REPO_ROOT}/.spec-ref" | tr -d '[:space:]')"

if [[ -n "${SPEC_REPO:-}" ]]; then
  SOURCE_SCHEMAS="${SPEC_REPO}/schemas"
  if [[ ! -d "${SOURCE_SCHEMAS}" ]]; then
    echo "ERROR: SPEC_REPO=${SPEC_REPO} but ${SOURCE_SCHEMAS} not found" >&2
    exit 1
  fi
  echo "Comparing against local spec checkout at ${SPEC_REPO} (.spec-ref=${SPEC_REF} — not enforced for local mode)"
else
  TMPDIR="$(mktemp -d)"
  trap 'rm -rf "${TMPDIR}"' EXIT
  echo "Cloning ospp-org/spec at ${SPEC_REF}..."
  git clone --quiet --depth 1 --branch "${SPEC_REF}" https://github.com/ospp-org/spec.git "${TMPDIR}/spec"
  SOURCE_SCHEMAS="${TMPDIR}/spec/schemas"
fi

if diff -rq --exclude=README.md --exclude=SchemaPath.ts "${SOURCE_SCHEMAS}" "${REPO_ROOT}/src/schemas" > /tmp/schema-diff.txt 2>&1; then
  echo "OK — vendored src/schemas/ are byte-identical to spec ${SPEC_REF}"
  exit 0
fi

echo "DRIFT detected between vendored src/schemas/ and spec ${SPEC_REF}:" >&2
cat /tmp/schema-diff.txt >&2
echo "" >&2
echo "Fix: copy spec/schemas/* → src/schemas/ (cp -r) and re-commit. Do" >&2
echo "not edit vendored schemas in-place; they are byte-mirror copies of" >&2
echo "the spec source pinned by .spec-ref." >&2
exit 1
