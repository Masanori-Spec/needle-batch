# Exact bounded model

For job t let R[t] be its set of operator-declared thread identities. A physical load state assigns one thread or empty to every needle. Unavailable needles are excluded from coverage and never change. Locked usable needles retain their initial loads. For each job, R[t] must be a subset of usable loaded threads. The cost between states is the number of changed physical loads. The initial-to-first state transition counts. Needle selection commands within a job do not count as spool replacements.

## Dynamic program

The production solver advances through the fixed job list. For every reachable state it finds currently missing required threads, then enumerates every subset of editable physical positions of the necessary size whose removal retains at least one copy of each already-present required thread. Missing identities are assigned to those positions in deterministic identity/physical-position order. It minimizes accumulated replacement count over these states and stores a physical witness for each job.

### Why only load currently missing threads?

Consider any feasible unrestricted plan. A replacement introducing a thread before its next use can be deferred until immediately before the first job needing that loaded copy, with no additional cost. While deferred, its original thread stays present, so intervening requirements cannot become less covered. If the prefetched copy is replaced without being used, omit that replacement. Apply repeatedly. Similarly, unloading to empty cannot improve coverage or unit replacement cost and can be omitted/deferred. Thus an optimum exists that changes only the positions needed to load missing current requirements. Existing required copies need not be relocated; all editable positions are otherwise interchangeable.

### Why merge permutations?

All editable usable positions have identical capabilities and replacement costs; only locked/unavailable positions have special restrictions, and those never change. Future achievable costs depend on the multiset of editable loads, not their physical permutation. States with equal editable-load multisets are therefore equivalent for future costs. Keep a minimum-cost representative and its physical witness. Duplicate initial loads are retained in the multiset and can be reclaimed if another required copy remains. Locked loads remain independently available. This argument would fail for per-needle costs, needle-specific compatibility or mid-job changes; those are deliberately outside the model.

Induction over job boundaries proves the DP returns the minimum among these normalized plans, and normalization proves that minimum equals the unrestricted model optimum. Ties keep the first deterministic candidate. This is a standard exact state-search technique, not a claim of algorithmic novelty.

## Independent challenge

`oracle/exhaustive.py` does not use this reduction. It enumerates the Cartesian product of every allowed thread plus empty for every editable physical position, including duplicate loads, early prefetch and unnecessary replacements. It filters complete states by job coverage and examines all predecessor-state edges. `oracle/crosscheck.py` compares cost/feasibility and independently validates the production physical witness across fixed and seeded small cases. Large oracle cases return `resource_limit`, never an unproven optimum. The browser solver still supports its documented maximum model; the slow oracle is test-only.

## Baseline

The displayed greedy baseline processes jobs in their fixed order and uses the lowest-numbered eligible editable positions to load missing threads, retaining each currently needed thread. It has no lookahead. It is a reproducible reference, not a representation of every existing product or operator workflow.
