import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {resolveStaticPath} from '../scripts/server-path.mjs';

test('static server accepts normal paths under a directory URL with its trailing slash', () => {
  const root = path.resolve('/tmp/needle-server-test/dist') + path.sep;
  assert.equal(resolveStaticPath(root, '/web/'), path.resolve(root, 'web'));
  assert.equal(resolveStaticPath(root, '/'), path.resolve(root));
  assert.equal(resolveStaticPath(root, '/src/core.mjs?version=1'), path.resolve(root, 'src/core.mjs'));
});

test('static server accepts the exact hosted-CI subdirectory mount', () => {
  const root = '/tmp/needle-server-test/dist/';
  assert.equal(resolveStaticPath(root, '/needle-batch/web/', '/needle-batch/'), path.resolve(root, 'web'));
  assert.equal(resolveStaticPath(root, '/needle-batch/fixtures/01-c.u01', '/needle-batch/'), path.resolve(root, 'fixtures/01-c.u01'));
  assert.throws(() => resolveStaticPath(root, '/other/web/', '/needle-batch/'));
  assert.throws(() => resolveStaticPath(root, '/needle-batch-other/web/', '/needle-batch/'));
});

test('static server rejects encoded traversal, absolute paths and malformed escapes', () => {
  const root = '/tmp/needle-server-test/dist/';
  for (const request of ['/..%2fprivate', '/%2fetc/passwd', '/%']) {
    assert.throws(() => resolveStaticPath(root, request));
  }
  assert.throws(() => resolveStaticPath(root, '/needle-batch/%2e%2e%2fprivate', '/needle-batch/'));
  assert.throws(() => resolveStaticPath(root, '/web/', 'relative'));
});
