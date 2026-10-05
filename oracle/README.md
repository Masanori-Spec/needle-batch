# Independent exhaustive oracle

`exhaustive.py` is a Python-standard-library reference implementation. It does not
import or reproduce the production JavaScript successor generator, occupancy
canonicalization, lazy reload rule, or pruning. The only production-code use is
in `crosscheck.py`, which runs the JavaScript candidate in a separate Node
process and compares its results to the independently computed expectations.

## Model

- 2–8 ordered jobs, each declaring at least one thread identity
- 1–15 listed physical needle numbers, distinct integers from 1 through 15
- 1–6 usable physical needles; unavailable positions cannot sew or change
- At most 10 thread identities across all initial loads and job mappings
- A locked needle remains usable with its fixed load; locked null is inert
- Duplicate initial thread loads and repeated thread IDs in a job are allowed
- All distinct threads required by a job must be simultaneously loaded for the
  entire job; there is no mid-job reload
- Each physical slot whose thread changes costs one, including preparation
  before the first job; a null-to-thread load also costs one
- Thread IDs are exact, trimmed, nonempty strings of at most 64 UTF-16 code units
  without ASCII controls. An omitted or empty initial load normalizes to null

Example input:

```json
{
  "needles": [
    {"number": 1, "thread": "A"},
    {"number": 2, "thread": "B"},
    {"number": 3, "thread": "L", "locked": true}
  ],
  "jobs": [
    {"name": "J1", "threads": ["C"]},
    {"name": "J2", "threads": ["A"]},
    {"name": "J3", "threads": ["B", "C", "B", "C"]}
  ]
}
```

This has optimum **2**: before J1 replace needle 2's B with C; before J3 replace
needle 1's A with B. J3's ordered thread requests map to needles **1, 2, 1, 2**.
Repeated IDs specify an ordered command witness without adding capacity needs.
The solver itself only requires the corresponding set to be loaded.

## Why this is exhaustive

For every editable physical slot, enumerate the entire Cartesian product of
`{null} ∪ initial thread IDs ∪ required thread IDs`. This includes duplicated
loads, unused future threads, and completely empty loads. Locked/unavailable
slots stay at their initial values in every assignment. No physical-slot
symmetry reduction is applied.

An otherwise unknown thread can never serve a job. Replacing every occurrence
of such a thread with null preserves feasibility and cannot increase the
number of changes, so omitting unknown threads loses no optimum.

At each job boundary, retain every assignment covering that job's complete
required set. From every feasible preceding assignment, consider every feasible
current assignment. The edge cost is their physical-slot Hamming distance.
The initial predecessor is the actual initial load. Dynamic programming over
this complete layered graph therefore finds a minimum over all legal plans.
Backpointers return a full physical-slot witness.

## Run

From the repository root:

```sh
python3 -m unittest discover -s oracle -v
python3 oracle/exhaustive.py input.json
cat inputs.jsonl | python3 oracle/exhaustive.py --jsonl
python3 oracle/generate_cases.py --seed 20261005 --count 200 --output oracle/vectors.json
python3 oracle/crosscheck.py --count 10000 --systematic --report oracle/verification.json
```

It can also be called as `from oracle.exhaustive import solve` with a decoded
JSON object. Results have status `optimal`, `infeasible`, `invalid`, or
`resource_limit`; only `optimal` includes an integer `minimumChanges`.

The default guards are 100,000 enumerated assignments and 20,000,000 candidate
predecessor edges. A guard returns `resource_limit`, never an approximate optimum
or a claim of infeasibility. Use CLI `--max-assignments 0 --max-transitions 0`
(or Python `None`) to disable guards. The full production upper bound is not a
practical brute-force performance target. Random checks deliberately keep at
most 3 editable slots and 4 identities, while fixed cases cover the input bounds.

## Coverage and evidence

- `vectors.json`: 25 hand-checked boundary/edge cases and 200 seeded cases
- `generate_cases.py`: deterministic generator, independent of production JS
- `systematic_micro_vectors()`: the entire 2-slot / A,B,null-load / editable,
  locked,unavailable / 2–3-job family: 9 initial loads × 9 slot-mode combinations
  × (3² + 3³) required-set sequences = **2,916 inputs**
- `verification.json`: latest recorded comparison, with production source hash
- `crosscheck.py`: compares status and minimum cost, then independently validates
  every feasible JavaScript witness against original physical constraints
- `test_exhaustive.py`: exact canonical replacement/command assertions; full
  assignment enumeration; null/duplicate/locked/unavailable/impossible/bounds
  cases; determinism; resource-limit honesty; stale constraint rejection

The recorded run checked **12,941 cases**: 6,636 optimal, 5,973 infeasible, and
332 invalid, with zero mismatches. It includes 10,000 seeded cases, the 2,916
systematic micro-domain inputs, and 25 hand-checked vectors. This is strong
bounded test evidence, not an empirical proof for every production-size input.
Rerun after production optimizer changes; its SHA-256 is embedded in the report.

`validate_witness(input, result)` checks feasibility, physical replacement count,
command targets, and the exact current-model fingerprint. Changing initial
loads, job order/mappings, physical numbers, locks, or unavailable flags rejects
an old witness. Reordering the needle records without changing physical numbers
does not invalidate it. This fingerprint covers the mathematical model, not
source-file bytes; consumers must separately bind actual input files and mapping
provenance before export. It is a freshness check, not an authentication token.
