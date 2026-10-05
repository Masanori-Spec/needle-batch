# NeedleBatch

**順番はそのまま、次のジョブまで見通して糸交換を減らす。**

A local-first planner for a fixed-order batch of existing Barudan U01 embroidery files. It chooses physical needle loads across jobs, then changes only original needle-address command bits. Download the patched native files, a printable loading checklist and a command-level JSON manifest together.

## Try it

Requires Node.js 22+ to build/serve (the application itself has no runtime packages).

```sh
npm run build
npm run serve
# Open http://127.0.0.1:4173/web/
```

The Japanese-first interface includes English, keyboard controls, editable physical needle positions and constraints, file order controls, source-needle mappings and stitch previews. Everything runs in the browser. No design uploads, telemetry, remote palette lookup, account or backend. A local HTTP server is needed for ES modules and demo fixture loading; directly double-clicking index.html is not supported. Static hosting works under a subdirectory.

### The demo

Initial loads: N1=A, N2=B, N3=L (locked). Ordered jobs: C; A; B,C,B,C.

- Before job 1: replace N2 B with C
- Before job 2: no changes
- Before job 3: replace N1 A with B
- Minimum: **2** replacements; specified lowest-slot greedy baseline: **3**
- Job 3's native needle sequence is **1,2,1,2**

C is initially absent, so at least one replacement is necessary. With only two editable needles, retaining A through job 2 and having B,C for job 3 requires another. The plan attains this lower bound.

## Workflow / 使い方

1. Load the demo, or clear it and import 2–8 `.u01` designs. Confirm their displayed order.
2. Enter each actual physical needle number, current thread identity and locked/unavailable status. An empty load counts as one installation when first filled.
3. Map each source needle number to one explicit, stable thread identity. Include material, weight or other differences in that identity when spools are not interchangeable. The app does not infer identity from a displayed color. A source needle reused with a different physical thread after a STOP is unsupported; do not label it as one identity.
4. Calculate. Every required thread must fit simultaneously throughout each job; there are no mid-job reloads. If infeasible, the app will not export.
5. Review every loading change and physical needle assignment. Export the ZIP and keep the original designs. Changing any input clears the plan and disables stale export.

## Deliberately bounded v1

- Fixed order of 2–8 designs; 1–6 usable physical needles, numbered 1–15
- At most 10 declared thread identities across current loads and required designs
- Each file at most 1 MiB; combined files at most 4 MiB
- Native records: at most 200,000 per file / 500,000 per batch. Needle-selection commands: at most 10,000 per file / 30,000 per batch, to bound memory and manifest size
- One thread identity per source needle for the complete design
- Locked needles can sew with their current load but cannot change. Unavailable needles cannot sew or change
- All spool installations/replacements have equal cost, including preparation before the first job
- No thread change during a design, job reordering, stitch reordering, digitizing, palette database or excess-color splitting

The exact minimum applies only to that declared model. It is not an elapsed-time minimum. Software tests do not establish physical sewout, needle/thread/material compatibility, operator safety or compatibility with every Barudan machine/firmware version. Verify setup and the original-to-output mapping with a qualified operator before machine use.

## Conservative U01 profile

256-byte preserved header followed by complete 3-byte records. Low five control bits: 0–7 supported stitch/motion/speed/trim, 8 STOP, 9–23 explicit needles 1–15, 24 END. Coordinate sign bits and every non-needle byte are unchanged. Explicit selection must precede any sewing. A final zero-displacement END is required; trailers, partial records, unknown commands, implicit starting-needle reliance and incomplete mappings are rejected. STOPs and repeated needle commands are retained. Moving STOP/needle records preserve their displacements exactly. The header is preserved, not recomputed. No generic embroidery writer is used on export.

## Verification

```sh
npm ci --ignore-scripts
npm run check
python3 oracle/crosscheck.py --count 1000 --report oracle/verification.json
python3 -m pip install --require-hashes -r requirements-test.txt
python3 scripts/consumer-spike.py
python3 scripts/verify-bundle.py
# With supported sandboxed Chromium:
npx --no-install playwright install chromium
npm run serve
npm run test:browser
```

- Node tests: parser rejection, exact byte eligibility, slot constraints, stale export, hostile text and seeded oracle vectors
- Independent Python oracle: every physical load assignment and predecessor transition for small seeded cases, including prefetch, null and duplicate loads; no production-solver helpers
- Real consumer: downloaded, SHA-256-pinned `pystitch==1.0.1`, reading actual exported ZIP members; checks all coordinates, all non-needle commands, STOP positions and exact needle IDs
- Browser CI: sandboxed Chromium on Ubuntu 22.04, real downloads, Japanese/English, desktop/mobile layout, keyboard and interrupted/changed-input flows; independently consumes the browser-downloaded ZIP and prints its actual checklist to a PDF with text/bounds checks and rendered page evidence

Read [verification notes](docs/VERIFICATION.md), [algorithm proof](docs/ALGORITHM.md), [research and positioning](docs/RESEARCH.md), and [fixture provenance](fixtures/PROVENANCE.md). Local browser execution status must be read from the evidence report, not inferred from the presence of a CI script.

## Distribution

No license has been granted for the original app code or geometric fixtures. Zero runtime dependencies. Playwright and pystitch are test-only and excluded from distribution archives. No commercial designs, manufacturer thread charts, fonts, SDKs or third-party application binaries are bundled. See [third-party notices](THIRD_PARTY_NOTICES.md).
