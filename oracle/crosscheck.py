#!/usr/bin/env python3
"""Compare production JS costs/witnesses to independently enumerated Python cases."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

try:
    from .exhaustive import parse_model, validate_witness
    from .generate_cases import fixed_vectors, generate, systematic_micro_vectors
except ImportError:
    from exhaustive import parse_model, validate_witness
    from generate_cases import fixed_vectors, generate, systematic_micro_vectors


JS = r"""
import fs from 'node:fs';
const {optimize} = await import(process.argv[1]);
const vectors = JSON.parse(fs.readFileSync(0, 'utf8'));
const results = vectors.map(v => {
  try { return optimize(v.input); }
  catch (error) { return {status:'invalid',minimumChanges:null,reason:error.message}; }
});
process.stdout.write(JSON.stringify(results));
"""


def check_js_witness(payload, result):
    model = parse_model(payload)
    before = [n.thread for n in model.needles]
    steps = result.get('steps')
    if not isinstance(steps, list) or len(steps) != len(model.jobs):
        return ['production result must contain one step per job']
    plan = []
    for index, (step, job) in enumerate(zip(steps, model.jobs)):
        loads = step.get('loads', [])
        by_number = {entry['number']: entry['thread'] for entry in loads}
        if len(by_number) != len(model.needles) or set(by_number) != {n.number for n in model.needles}:
            return ['production result changed physical needle numbers']
        after = [by_number[n.number] for n in model.needles]
        assignments = step.get('threadToNeedle', {})
        plan.append({'jobIndex': index, 'before': before, 'after': after,
                     'changes': [{'needle': c['number'], 'from': c['from'], 'to': c['to']}
                                 for c in step.get('changes', [])],
                     'needleSequence': [assignments.get(t) for t in job.threads]})
        before = after
    converted = {'status': 'optimal', 'minimumChanges': result['minimumChanges'],
                 'modelFingerprint': model.fingerprint,
                 'needleNumbers': [n.number for n in model.needles], 'plan': plan}
    return validate_witness(payload, converted)['errors']


def main():
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seed', type=int, default=20261005)
    parser.add_argument('--count', type=int, default=1000)
    parser.add_argument('--optimizer', default=str(root / 'src' / 'core.mjs'))
    parser.add_argument('--systematic', action='store_true', help='also check all 2,916 tiny-domain inputs')
    parser.add_argument('--report', help='optional JSON report path')
    args = parser.parse_args()
    optimizer = Path(args.optimizer).resolve()
    micro = list(systematic_micro_vectors()) if args.systematic else []
    vectors = fixed_vectors() + list(generate(args.seed, args.count)) + micro
    process = subprocess.run(['node', '--input-type=module', '-e', JS, optimizer.as_uri()],
                             input=json.dumps(vectors), text=True, capture_output=True, check=True)
    results = json.loads(process.stdout)
    if len(results) != len(vectors):
        raise RuntimeError('production result count mismatch')
    failures, statuses = [], {}
    for vector, result in zip(vectors, results):
        expected = vector['expected']
        actual = {key: result.get(key) for key in ('status', 'minimumChanges')}
        statuses[expected['status']] = statuses.get(expected['status'], 0) + 1
        errors = []
        if actual != expected:
            errors.append('status or optimum differs from exhaustive reference')
        if result.get('status') == 'optimal':
            errors.extend(check_js_witness(vector['input'], result))
        if errors:
            failures.append({'name': vector['name'], 'input': vector['input'],
                             'expected': expected, 'actual': actual, 'errors': errors})
    report = {'passed': not failures, 'cases': len(vectors), 'seed': args.seed,
              'generatedCases': args.count, 'handCheckedCases': len(fixed_vectors()),
              'systematicCases': len(micro),
              'caseStatuses': statuses, 'optimizerSha256': hashlib.sha256(optimizer.read_bytes()).hexdigest(),
              'failures': failures}
    rendered = json.dumps(report, indent=2) + '\n'
    if args.report:
        Path(args.report).write_text(rendered)
    print(rendered, end='')
    return int(bool(failures))


if __name__ == '__main__':
    sys.exit(main())
