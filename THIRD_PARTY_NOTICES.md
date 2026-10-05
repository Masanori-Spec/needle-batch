# Third-party notices

## Browser/runtime

No third-party runtime code, font, image, palette or SDK is bundled. The browser uses standard Web APIs and original app code. The original app, geometric fixtures and generator have no license grant in this release.

## Tests only, not redistributed in the release

- **pystitch 1.0.1**, MIT; https://pypi.org/project/pystitch/1.0.1/ and https://github.com/inkstitch/pystitch . Wheel SHA-256: `06ca3502111e2e782b9d4c4f18a2aa1c5e60588436d7697f2481bfe171f12c1b`. Installed separately by pip for independent consumer verification. The wheel lists no runtime requirements. Neither the wheel nor copied consumer source is included in the release.
- **Playwright / @playwright/test 1.56.0**, Apache-2.0; https://github.com/microsoft/playwright . Exact versions/integrity are recorded in package-lock.json. Installed separately for browser QA. node_modules and downloaded browsers are excluded from the release.
- Python and Node.js runtimes are prerequisites and are not bundled.

Product names and formats belong to their respective owners. No endorsement or affiliation is implied. Review upstream licenses before separately redistributing those test tools.
