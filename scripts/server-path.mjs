import path from 'node:path';

// Normalize the directory URL's trailing slash before the containment check.
// Kept independent of HTTP so the same path gate is regression-tested offline.
export function resolveStaticPath(directory, requestUrl, prefix = '/') {
  const root = path.resolve(directory);
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  if (!prefix.startsWith('/') || !prefix.endsWith('/')) throw new Error('Base path must start and end with /');
  if (!pathname.startsWith(prefix)) throw new Error('Outside mount');
  const target = path.resolve(root, pathname.slice(prefix.length) || '.');
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error('Outside root');
  return target;
}
