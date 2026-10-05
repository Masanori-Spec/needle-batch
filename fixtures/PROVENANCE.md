# Original fixture provenance

The three U01 fixtures in this folder are original abstract line designs authored for NeedleBatch on 2026-10-05 by `scripts/author-fixtures.py`. They were not downloaded, traced from commercial artwork or extracted from a vendor design. Thread labels A/B/C/L are arbitrary test identities, not a manufacturer palette.

The checked-in generator independently encodes the documented 256-byte header and 3-byte records. It includes nonzero displacement on needle and STOP records, both coordinate signs, FAST/SLOW and jump variants, trims, repeated B/C needle blocks and END. Source needles (1; 2; 3/4) intentionally differ from the optimized target numbers (2; 1; 1/2) so consumer checks cannot pass solely by copying input.

`demo.json` declares all initial loads, locks and stable source-thread mappings. The original-file SHA-256 hashes are recorded in `artifacts/consumer-spike.json` and each generated export manifest. Regenerating these fixtures must be followed by tests and a fresh manifest.

These small designs are software fixtures, not production sewout patterns. They contain no tested underlay, tension, tie-in/out or material suitability prescription. Do not interpret their availability as a recommendation to sew them. This release does not grant a license to the original fixtures or generator.
