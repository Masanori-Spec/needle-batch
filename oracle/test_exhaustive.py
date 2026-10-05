import copy
import json
import unittest
from exhaustive import enumerate_assignments, parse_model, solve, validate_witness
from generate_cases import fixed_vectors, generate


class ExhaustiveOracleTests(unittest.TestCase):
    def test_hand_checked_vectors(self):
        for vector in fixed_vectors():
            with self.subTest(name=vector['name']):
                result = solve(vector['input'])
                self.assertEqual({k: result[k] for k in ('status', 'minimumChanges')}, vector['expected'])
                if result['status'] == 'optimal':
                    self.assertTrue(validate_witness(vector['input'], result)['valid'])

    def test_canonical_witness(self):
        payload = fixed_vectors()[0]['input']
        result = solve(payload)
        self.assertEqual(result['minimumChanges'], 2)
        self.assertEqual(result['plan'][0]['changes'], [{'needle': 2, 'from': 'B', 'to': 'C'}])
        self.assertEqual(result['plan'][1]['changes'], [])
        self.assertEqual(result['plan'][2]['changes'], [{'needle': 1, 'from': 'A', 'to': 'B'}])
        self.assertEqual(result['plan'][2]['needleSequence'], [1, 2, 1, 2])

    def test_full_cartesian_product_includes_null_duplicates_and_prefetch(self):
        payload = {'needles': [{'number': 1, 'thread': 'A'}, {'number': 2, 'thread': 'B'}],
                   'jobs': [{'threads': ['A']}, {'threads': ['C']}]}
        states = enumerate_assignments(parse_model(payload))
        self.assertEqual(len(states), 4 ** 2)
        self.assertIn((None, None), states)
        self.assertIn(('A', 'A'), states)
        self.assertIn(('C', 'C'), states)

    def test_generated_vectors_and_witnesses_are_reproducible(self):
        left, right = list(generate(count=60)), list(generate(count=60))
        self.assertEqual(left, right)
        for vector in left:
            result = solve(vector['input'])
            self.assertIn(result['status'], ('optimal', 'infeasible'))
            if result['status'] == 'optimal':
                self.assertTrue(validate_witness(vector['input'], result)['valid'], vector['name'])

    def test_stale_constraints_and_mappings_are_rejected(self):
        payload = fixed_vectors()[0]['input']
        result = solve(payload)
        mutations = [
            lambda p: p['needles'][0].update(thread='X'),
            lambda p: p['needles'][1].update(locked=True),
            lambda p: p['needles'][1].update(unavailable=True),
            lambda p: p['needles'][0].update(number=5),
            lambda p: p['jobs'][0].update(threads=['A']),
            lambda p: p['jobs'].reverse(),
            lambda p: p['jobs'][2].update(threads=['C', 'B', 'C', 'B']),
        ]
        for mutation in mutations:
            changed = copy.deepcopy(payload)
            mutation(changed)
            check = validate_witness(changed, result)
            self.assertFalse(check['valid'])
            self.assertTrue(any('stale input' in e for e in check['errors']))
        reordered = copy.deepcopy(payload)
        reordered['needles'].reverse()
        self.assertTrue(validate_witness(reordered, result)['valid'])

    def test_tampered_fixed_and_unavailable_needles_rejected(self):
        payload = fixed_vectors()[0]['input']
        result = solve(payload)
        result['plan'][0]['after'][2] = 'C'
        self.assertFalse(validate_witness(payload, result)['valid'])
        payload = fixed_vectors()[5]['input']
        result = solve(payload)
        result['plan'][0]['needleSequence'] = [1]
        self.assertFalse(validate_witness(payload, result)['valid'])

    def test_resource_guards_never_claim_an_optimum(self):
        payload = fixed_vectors()[0]['input']
        self.assertEqual(solve(payload, max_assignments=1)['status'], 'resource_limit')
        self.assertEqual(solve(payload, max_transitions=1)['status'], 'resource_limit')

    def test_invalid_types(self):
        valid = fixed_vectors()[0]['input']
        for bad in (None, [], {}, {'needles': [], 'jobs': []}):
            self.assertEqual(solve(bad)['status'], 'invalid')
        for field, value in [('number', True), ('locked', 1), ('unavailable', 'false'), ('thread', 7)]:
            bad = copy.deepcopy(valid)
            bad['needles'][0][field] = value
            self.assertEqual(solve(bad)['status'], 'invalid')


if __name__ == '__main__':
    unittest.main()
