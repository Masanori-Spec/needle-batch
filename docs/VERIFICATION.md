# Verification record

## Passed locally on 2026-10-05

- Consumer-first spike: three original generated U01 fixtures; exact target needle sequences [2], [1], [1,2,1,2]; all decoded coordinates and non-needle commands equal, including moving needle and STOP records
- Exact-pinned consumer: downloaded `pystitch==1.0.1`, wheel SHA-256 `06ca3502111e2e782b9d4c4f18a2aa1c5e60588436d7697f2481bfe171f12c1b`; installed outside project and never bundled
- Additional consumer edge gate: the pinned reader successfully interpreted all 1,800 combinations of 15 source needles × 15 output needles × eight high-control-bit patterns, preserving moving needle and STOP geometry
- Native export: the actual generated ZIP is read with Python zipfile, a separate raw-byte oracle and the pinned consumer. Byte length, header, non-needle bytes, coordinate signs, STOPs and repeated needle commands are checked. Source and output SHA-256 values are matched
- Independent exact enumeration: 12,941 comparisons comprising 25 hand cases, 10,000 seeded cases and 2,916 systematic cases. Zero status/cost/physical-witness mismatches. Oracle report records the exact production core source hash
- Resource guards cap native record and needle-command counts before large allocation; DP paths remain lightweight until the winning witness is chosen. Mid-export changes cannot alter the frozen source bytes used by pending output
- Node tests include all 15×15 needle retargetings under all eight high-control-bit combinations, hostile names, prototype-like thread IDs, bounds, duplicate loads, locks/unavailability and stale input exports (including coordinate-only input changes)

## Browser gate

Local sandboxed Chromium launch was attempted and blocked by this managed container's socket permission: `process_singleton_posix.cc: socket() failed: Operation not permitted`. No sandbox was disabled, no shared browser was used, and this is not counted as a browser pass.

`.github/workflows/verify.yml` defines a separate Ubuntu 22.04 job using sandboxed Chromium. It must run after publication. The test performs real UI interactions and downloads, then `scripts/verify-bundle.py` consumes the actual downloaded ZIP. The exact checklist HTML inside that downloaded ZIP is rendered under print media and saved as PDF. Poppler checks PDF text and page bounds, then renders every PDF page as a PNG for visual review. Screenshots, test results, print evidence and the download are uploaded as CI artifacts. Until a successful exact-commit CI run is recorded by the publisher, browser rendering and download behavior remain **not yet verified in a live browser**.

## Test scope is not machine safety

These gates establish the stated minimum within the bounded mathematical model and how one independent software reader interprets files. They do not prove physical sewout, material/needle/thread compatibility, elapsed-time savings, all firmware support or operator safety. No machine was controlled. No file was uploaded to a third-party embroidery site. No third-party design/palette/font/application was redistributed.

## Recovery review

A second local review verified a clean extraction of the source ZIP, then reran the complete 12,941-case oracle, the pinned 1,800-case consumer edge gate, and the actual native export checks. No production optimizer or parser change was needed. The release packaging now excludes raw logs/traces and any original-code license grant; test dependency attribution is retained. Long checklist fields wrap, and only the first 120 selections are printed when a job has a longer sequence; the JSON manifest and native files still retain every selection. The new hosted print gate is authored but has not run locally. A trailing-slash error in the static server containment check was reproduced and fixed. Three regression cases now cover normal paths, the hosted subdirectory mount and encoded traversal. A real local HTTP smoke check returned the HTML and exact core module under `/needle-batch/`, and rejected traversal with HTTP 404; this is not a browser-rendering pass.

The full supported 500,000-record / 30,000-needle-command expansion was rerun successfully under a 256 MiB Node old-space limit. `scripts/verify-boundary.mjs` reproduces it in `npm run check`; it asserts complete manifest commands and unchanged native bytes for an already-loaded synthetic batch. This is a memory/expansion case, not a worst-case timing bound.
