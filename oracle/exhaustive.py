#!/usr/bin/env python3
"""Independent exhaustive reference for NeedleBatch's fixed-order reload model.

No application code is imported. Every mutable-needle assignment is enumerated,
including duplicate loads, null loads, and loads unnecessary for the current job.
The cost of each possible predecessor/current pair is physical Hamming distance.
This deliberately trades speed for a small and independently auditable oracle.
"""
from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import sys
from dataclasses import dataclass
from typing import Any


class InvalidInput(ValueError):
    pass


class ResourceLimit(RuntimeError):
    pass


@dataclass(frozen=True)
class Needle:
    number: int
    thread: str | None
    locked: bool
    unavailable: bool


@dataclass(frozen=True)
class Job:
    name: str
    threads: tuple[str, ...]


@dataclass(frozen=True)
class Model:
    needles: tuple[Needle, ...]
    jobs: tuple[Job, ...]
    alphabet: tuple[str | None, ...]

    @property
    def snapshot(self) -> dict[str, Any]:
        return {
            'needles': [vars(n) for n in self.needles],
            'jobs': [{'name': j.name, 'threads': list(j.threads)} for j in self.jobs],
        }

    @property
    def fingerprint(self) -> str:
        raw = json.dumps(self.snapshot, sort_keys=True, ensure_ascii=False,
                         separators=(',', ':')).encode('utf-8')
        return hashlib.sha256(raw).hexdigest()


def _thread(value: Any, where: str, nullable: bool = False) -> str | None:
    if nullable and (value is None or value == ''):
        return None
    if (not isinstance(value, str) or not value or value != value.strip()
            or len(value.encode('utf-16-le', errors='surrogatepass')) // 2 > 64
            or any(ord(c) < 32 or ord(c) == 127 for c in value)):
        raise InvalidInput(f'{where} must be a nonempty thread ID' + (' or null' if nullable else ''))
    return value


def parse_model(payload: Any) -> Model:
    if not isinstance(payload, dict):
        raise InvalidInput('input must be an object')
    raw_needles, raw_jobs = payload.get('needles'), payload.get('jobs')
    if not isinstance(raw_needles, list) or not 1 <= len(raw_needles) <= 15:
        raise InvalidInput('needles must contain 1–15 physical slots')
    if not isinstance(raw_jobs, list) or not 2 <= len(raw_jobs) <= 8:
        raise InvalidInput('jobs must contain 2–8 ordered jobs')
    needles, numbers, ids = [], set(), set()
    for i, raw in enumerate(raw_needles):
        if not isinstance(raw, dict):
            raise InvalidInput(f'needles[{i}] must be an object')
        number = raw.get('number')
        if type(number) is not int or not 1 <= number <= 15 or number in numbers:
            raise InvalidInput('physical needle numbers must be distinct integers from 1 to 15')
        numbers.add(number)
        thread = _thread(raw.get('thread'), f'needles[{i}].thread', nullable=True)
        locked, unavailable = raw.get('locked', False), raw.get('unavailable', False)
        if type(locked) is not bool or type(unavailable) is not bool:
            raise InvalidInput('locked and unavailable flags must be booleans')
        needles.append(Needle(number, thread, locked, unavailable))
        if thread is not None:
            ids.add(thread)
    if not 1 <= sum(not n.unavailable for n in needles) <= 6:
        raise InvalidInput('1–6 needles must be usable')
    jobs = []
    for i, raw in enumerate(raw_jobs):
        if not isinstance(raw, dict) or not isinstance(raw.get('threads'), list) or not raw['threads']:
            raise InvalidInput(f'jobs[{i}].threads must be a nonempty array')
        name = raw.get('name', f'Job {i + 1}')
        if not isinstance(name, str):
            name = f'Job {i + 1}'
        threads = tuple(_thread(t, f'jobs[{i}].threads') for t in raw['threads'])
        ids.update(threads)
        jobs.append(Job(name, threads))
    if len(ids) > 10:
        raise InvalidInput('at most 10 distinct thread IDs may appear in loads and jobs')
    return Model(tuple(sorted(needles, key=lambda n: n.number)), tuple(jobs), (None, *sorted(ids)))


def _covers(model: Model, assignment: tuple, job: Job) -> bool:
    loaded = {t for n, t in zip(model.needles, assignment) if not n.unavailable and t is not None}
    return set(job.threads).issubset(loaded)


def enumerate_assignments(model: Model, max_assignments: int | None = 100_000) -> list[tuple]:
    mutable = [i for i, n in enumerate(model.needles) if not n.locked and not n.unavailable]
    count = len(model.alphabet) ** len(mutable)
    if max_assignments is not None and count > max_assignments:
        raise ResourceLimit(f'exhaustive assignment count {count} exceeds limit {max_assignments}')
    initial = tuple(n.thread for n in model.needles)
    assignments = []
    for values in itertools.product(model.alphabet, repeat=len(mutable)):
        state = list(initial)
        for i, value in zip(mutable, values):
            state[i] = value
        assignments.append(tuple(state))
    return assignments


def distance(left: tuple, right: tuple) -> int:
    return sum(a != b for a, b in zip(left, right))


def solve(payload: Any, *, max_assignments: int | None = 100_000,
          max_transitions: int | None = 20_000_000) -> dict[str, Any]:
    """Return optimal/infeasible/invalid/resource_limit, never an approximate optimum.

    Pass None for a budget to remove that guard. Production boundary inputs can
    be too large for the intentionally exhaustive reference; use small cases.
    """
    try:
        model = parse_model(payload)
        states = enumerate_assignments(model, max_assignments)
        candidates = [[s for s in states if _covers(model, s, job)] for job in model.jobs]
        for index, allowed in enumerate(candidates):
            if not allowed:
                return {'status': 'infeasible', 'minimumChanges': None,
                        'reason': f'Job {index + 1} cannot be loaded simultaneously',
                        'jobIndex': index, 'modelFingerprint': model.fingerprint}
        transition_count = len(candidates[0]) + sum(
            len(a) * len(b) for a, b in zip(candidates, candidates[1:]))
        if max_transitions is not None and transition_count > max_transitions:
            raise ResourceLimit(f'exhaustive transition count {transition_count} exceeds limit {max_transitions}')
        initial = tuple(n.thread for n in model.needles)
        previous = {initial: 0}
        backpointers = []
        evaluated = 0
        for allowed in candidates:
            current, parents = {}, {}
            for state in allowed:
                best_cost, best_parent = None, None
                for predecessor, cost in previous.items():
                    candidate = cost + distance(predecessor, state)
                    evaluated += 1
                    if best_cost is None or candidate < best_cost:
                        best_cost, best_parent = candidate, predecessor
                current[state], parents[state] = best_cost, best_parent
            previous = current
            backpointers.append(parents)
        final = min(previous, key=previous.get)
        optimum = previous[final]
        path, cursor = [], final
        for parents in reversed(backpointers):
            path.append(cursor)
            cursor = parents[cursor]
        path.reverse()
        plan, before = [], initial
        for index, (job, after) in enumerate(zip(model.jobs, path)):
            changes = [{'needle': n.number, 'from': old, 'to': new}
                       for n, old, new in zip(model.needles, before, after) if old != new]
            assignment = {t: min(n.number for n, loaded in zip(model.needles, after)
                                 if not n.unavailable and loaded == t) for t in set(job.threads)}
            plan.append({'jobIndex': index, 'name': job.name,
                         'before': list(before), 'after': list(after), 'changes': changes,
                         'needleSequence': [assignment[t] for t in job.threads]})
            before = after
        return {'status': 'optimal', 'minimumChanges': optimum,
                'modelFingerprint': model.fingerprint, 'needleNumbers': [n.number for n in model.needles],
                'plan': plan, 'enumeratedAssignments': len(states), 'evaluatedTransitions': evaluated}
    except InvalidInput as exc:
        return {'status': 'invalid', 'minimumChanges': None, 'reason': str(exc)}
    except ResourceLimit as exc:
        return {'status': 'resource_limit', 'minimumChanges': None, 'reason': str(exc)}


def validate_witness(payload: Any, result: dict[str, Any]) -> dict[str, Any]:
    """Check feasibility and cost of an oracle witness against the CURRENT inputs.

    This verifies a witness, not its optimality. A fingerprint mismatch rejects
    stale mappings, locks, unavailable flags, physical IDs, loads, or job order.
    """
    errors = []
    try:
        model = parse_model(payload)
    except InvalidInput as exc:
        return {'valid': False, 'errors': [str(exc)]}
    if result.get('status') != 'optimal':
        return {'valid': False, 'errors': ['witness must have optimal status']}
    if result.get('modelFingerprint') != model.fingerprint:
        errors.append('stale input: model fingerprint differs')
    if result.get('needleNumbers') != [n.number for n in model.needles]:
        errors.append('physical needle numbers differ')
    plan = result.get('plan')
    if not isinstance(plan, list) or len(plan) != len(model.jobs):
        return {'valid': False, 'errors': errors + ['plan must contain exactly one step per job']}
    before, total = tuple(n.thread for n in model.needles), 0
    for index, (job, step) in enumerate(zip(model.jobs, plan)):
        if not isinstance(step, dict) or not isinstance(step.get('after'), list) or len(step['after']) != len(before):
            errors.append(f'job {index + 1}: invalid assignment length')
            continue
        after = tuple(step['after'])
        if any(t is not None and not isinstance(t, str) for t in after):
            errors.append(f'job {index + 1}: invalid loaded thread type')
            continue
        if not isinstance(step.get('before'), list) or tuple(step['before']) != before:
            errors.append(f'job {index + 1}: wrong preceding physical loads')
        if step.get('jobIndex') != index:
            errors.append(f'job {index + 1}: wrong job index')
        for n, old, new in zip(model.needles, before, after):
            if (n.locked or n.unavailable) and old != new:
                errors.append(f'job {index + 1}: changed fixed needle {n.number}')
            if new not in model.alphabet:
                errors.append(f'job {index + 1}: unknown thread on needle {n.number}')
        if not _covers(model, after, job):
            errors.append(f'job {index + 1}: all required threads must be simultaneously loaded')
        changes = [{'needle': n.number, 'from': a, 'to': b}
                   for n, a, b in zip(model.needles, before, after) if a != b]
        if step.get('changes') != changes:
            errors.append(f'job {index + 1}: replacement list is incorrect')
        sequence = step.get('needleSequence')
        lookup = {n.number: (n, t) for n, t in zip(model.needles, after)}
        if not isinstance(sequence, list) or len(sequence) != len(job.threads):
            errors.append(f'job {index + 1}: invalid command assignment count')
        else:
            for number, required in zip(sequence, job.threads):
                pair = lookup.get(number) if type(number) is int else None
                if pair is None or pair[0].unavailable or pair[1] != required:
                    errors.append(f'job {index + 1}: command does not target a usable matching needle')
        total += distance(before, after)
        before = after
    if type(result.get('minimumChanges')) is not int or result['minimumChanges'] != total:
        errors.append('reported change count differs from physical replacements')
    return {'valid': not errors, 'errors': errors, 'countedChanges': total}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', nargs='?', help='JSON input file; defaults to stdin')
    parser.add_argument('--jsonl', action='store_true', help='read one JSON input per nonempty line')
    parser.add_argument('--max-assignments', type=int, default=100_000, help='0 disables this exhaustive-space guard')
    parser.add_argument('--max-transitions', type=int, default=20_000_000, help='0 disables this exhaustive-space guard')
    args = parser.parse_args()
    stream = open(args.input, encoding='utf-8') if args.input else sys.stdin
    options = {'max_assignments': args.max_assignments or None, 'max_transitions': args.max_transitions or None}
    try:
        if args.jsonl:
            for line in stream:
                if line.strip():
                    try:
                        result = solve(json.loads(line), **options)
                    except json.JSONDecodeError as exc:
                        result = {'status': 'invalid', 'minimumChanges': None, 'reason': str(exc)}
                    print(json.dumps(result, ensure_ascii=False))
        else:
            try:
                result = solve(json.load(stream), **options)
            except json.JSONDecodeError as exc:
                result = {'status': 'invalid', 'minimumChanges': None, 'reason': str(exc)}
            print(json.dumps(result, ensure_ascii=False, indent=2))
    finally:
        if stream is not sys.stdin:
            stream.close()


if __name__ == '__main__':
    main()
