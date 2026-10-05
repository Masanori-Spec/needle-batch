#!/usr/bin/env python3
"""Deterministic small-case generator; optional expected results use the oracle."""
from __future__ import annotations

import argparse
import itertools
import json
import random
try:
    from .exhaustive import solve
except ImportError:
    from exhaustive import solve


def job(*threads, name='Job'):
    return {'name': name, 'threads': list(threads)}


def needle(number, thread=None, *, locked=False, unavailable=False):
    return {'number': number, 'thread': thread, 'locked': locked, 'unavailable': unavailable}


def vector(name, needles, jobs, optimum=None, status='optimal'):
    return {'name': name, 'input': {'needles': needles, 'jobs': jobs},
            'expected': {'status': status, 'minimumChanges': optimum}}


def fixed_vectors():
    return [
        vector('canonical_locked_demo', [needle(1, 'A'), needle(2, 'B'), needle(3, 'L', locked=True)],
               [job('C', name='J1'), job('A', name='J2'), job('B', 'C', 'B', 'C', name='J3')], 2),
        vector('all_already_loaded', [needle(1, 'A'), needle(2, 'B')], [job('A', 'B'), job('B', 'A')], 0),
        vector('initial_null_load_counts', [needle(1)], [job('A'), job('A')], 1),
        vector('locked_thread_remains_usable', [needle(1, 'A', locked=True), needle(2)], [job('A', 'B'), job('A')], 1),
        vector('locked_thread_cannot_be_replaced', [needle(1, 'A', locked=True)], [job('B'), job('A')], status='infeasible'),
        vector('unavailable_loaded_thread_cannot_sew', [needle(1, 'A', unavailable=True), needle(2)], [job('A'), job('A')], 1),
        vector('unavailable_is_not_capacity', [needle(1, 'A', unavailable=True), needle(2, 'B')], [job('A', 'B'), job('A')], status='infeasible'),
        vector('invalid_all_unavailable', [needle(1, 'A', unavailable=True)], [job('A'), job('A')], status='invalid'),
        vector('duplicate_current_loads_are_allowed', [needle(1, 'A'), needle(2, 'A')], [job('A', 'B'), job('B', 'A')], 1),
        vector('duplicate_requirements_are_one_capacity', [needle(1)], [job('A', 'A', 'A'), job('A', 'A')], 1),
        vector('simultaneous_threads_no_mid_job_reload', [needle(1, 'A')], [job('A', 'B'), job('B')], status='infeasible'),
        vector('sparse_physical_numbers', [needle(15, 'B'), needle(1, 'A'), needle(7, 'L', locked=True)],
               [job('C'), job('A'), job('B', 'C', 'B', 'C')], 2),
        vector('unknown_initial_thread_is_retained_or_changed', [needle(1, 'OLD'), needle(2, 'A')], [job('B'), job('A', 'B')], 1),
        vector('invalid_empty_requirements', [needle(1), needle(2, 'A', locked=True)], [job(), job()], status='invalid'),
        vector('fixed_empty_needle_cannot_load', [needle(1, locked=True)], [job('A'), job('A')], status='infeasible'),
        vector('duplicate_locked_loads_do_not_add_distinct_capacity', [needle(1, 'A', locked=True), needle(2, 'A', locked=True), needle(3)], [job('A', 'B'), job('A', 'B', 'C')], status='infeasible'),
        vector('all_locked_upper_usable_bound', [needle(i, chr(64+i), locked=True) for i in range(1, 7)], [job('A', 'F')]*8, 0),
        vector('fifteen_physical_slots_six_usable', [needle(i, 'A', locked=i <= 6, unavailable=i > 6) for i in range(1, 16)], [job('A'), job('A')], 0),
        vector('ten_thread_ids_boundary', [needle(1, 'A')]+[needle(i+1, chr(65+i), unavailable=True) for i in range(1, 10)], [job('I'), job('J')], 2),
        vector('invalid_duplicate_physical_number', [needle(1, 'A'), needle(1, 'B')], [job('A'), job('B')], status='invalid'),
        vector('invalid_seven_usable', [needle(i, 'A') for i in range(1, 8)], [job('A'), job('A')], status='invalid'),
        vector('invalid_eleven_thread_ids', [needle(1, 'K')], [job(*list('ABCDE')), job(*list('FGHIJ'))], status='invalid'),
        vector('invalid_one_job', [needle(1, 'A')], [job('A')], status='invalid'),
        vector('invalid_nine_jobs', [needle(1, 'A')], [job('A')]*9, status='invalid'),
        vector('invalid_physical_number', [needle(16, 'A')], [job('A'), job('A')], status='invalid'),
    ]


def generate(seed=20261005, count=200):
    """Up to 3 mutable needles / 4 threads / 8 jobs for exhaustive CI speed.

    Includes feasible and infeasible inputs, duplicate command IDs, null loads,
    locks, unavailable loads, and sparse physical numbering. Uses no JS solver.
    """
    rng = random.Random(seed)
    for index in range(count):
        thread_count = rng.randint(1, 4)
        threads = [chr(65+i) for i in range(thread_count)]
        slots = rng.randint(1, 4)
        numbers = sorted(rng.sample(range(1, 16), slots))
        needles = []
        mutable_count = 0
        for number in numbers:
            unavailable = rng.random() < .20
            locked = rng.random() < .25
            if not unavailable and not locked:
                mutable_count += 1
                if mutable_count > 3:
                    locked = True
            loaded = rng.choice([None, *threads])
            needles.append(needle(number, loaded, locked=locked, unavailable=unavailable))
        if all(n['unavailable'] for n in needles):
            needles[0]['unavailable'] = False
        jobs = []
        for j in range(rng.randint(2, 8)):
            required = rng.sample(threads, rng.randint(1, min(3, len(threads))))
            if required and rng.random() < .30:
                required.extend(rng.choices(required, k=rng.randint(1, 3)))
            jobs.append(job(*required, name=f'Job {j+1}'))
        payload = {'needles': needles, 'jobs': jobs}
        result = solve(payload)
        yield {'name': f'seed_{seed}_case_{index:04d}', 'input': payload,
               'expected': {k: result[k] for k in ('status', 'minimumChanges')}}


def systematic_micro_vectors():
    """Entire finite family: 2 slots, A/B/null loads, 3 slot modes, 2–3 jobs.

    Each job's requirement is A, B, or {A,B}. 9 initial loads × 9 mode
    combinations × (3² + 3³) job sequences = 2,916 inputs, including invalid
    all-unavailable layouts. No random sampling occurs in this family.
    """
    index = 0
    for loads in itertools.product((None, 'A', 'B'), repeat=2):
        for modes in itertools.product(('editable', 'locked', 'unavailable'), repeat=2):
            needles = [needle(i+1, loads[i], locked=modes[i] == 'locked',
                              unavailable=modes[i] == 'unavailable') for i in range(2)]
            for length in (2, 3):
                for requirements in itertools.product((('A',), ('B',), ('A', 'B')), repeat=length):
                    payload = {'needles': needles, 'jobs': [job(*r) for r in requirements]}
                    result = solve(payload)
                    yield {'name': f'systematic_micro_{index:04d}', 'input': payload,
                           'expected': {k: result[k] for k in ('status', 'minimumChanges')}}
                    index += 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seed', type=int, default=20261005)
    parser.add_argument('--count', type=int, default=200)
    parser.add_argument('--fixed-only', action='store_true')
    parser.add_argument('--output', help='output file; otherwise stdout')
    args = parser.parse_args()
    vectors = fixed_vectors() + ([] if args.fixed_only else list(generate(args.seed, args.count)))
    content = json.dumps({'schemaVersion': 1, 'seed': args.seed, 'vectors': vectors}, ensure_ascii=False, indent=2)+'\n'
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as out:
            out.write(content)
    else:
        print(content, end='')


if __name__ == '__main__':
    main()
