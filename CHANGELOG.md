# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add favicon.

## [1.1.0-beta.1] - 2022-10-18

### Changed

- Update `web2cit` to v2.0.0-beta.1.
- Do not return an error if no target paths specified or none available from
  config files ([T321002]).

### Fixed

- Configure Express to run behind Toolforge's reverse proxy.

## [1.1.0-beta.0] - 2022-10-14

### Added

- An error is shown in cases where no applicable translation template has been
  found for a target webpage.
- Follow config file redirections.
- Serve JSON schema files from server ([T318352]).

### Changed

- Remove error handling no longer needed after resolving w2c-core's [T305163].
- Remove unnecessary translation messages.
- Update `web2cit` to v2.0.0-beta.0.

## [1.1.0-alpha.3] - 2022-09-22

### Changed

- Update `web2cit` to v2.0.0-alpha.2.

## [1.1.0-alpha.2] - 2022-09-21

### Changed

- Do not support node < 16 ([T316937]).

## [1.1.0-alpha.1] - 2022-09-21

### Added

- Add this changelog.
- Configure vscode to use custom TypeScript version.

### Changed

- Simplify debugging from vscode.
- Update `web2cit` to v2.0.0-alpha.1.

## [1.1.0-alpha.0] - 2022-08-31

### Changed

- Do not support npm < 7 to prevent package-lock version conflicts.

## [1.0.4] - 2022-10-03

### Added

- Added translations from translatewiki.net collaborators: French, Macedonian,
  Slovenian, Tagalog, Traditional Chinese, Bangla, and Japanese.

## [1.0.3] - 2022-08-08

### Changed

- Update web2cit to v1.0.1.

## [1.0.2] - 2022-08-01

### Changed

- Use w2c-core from npm.

## [1.0.1] - 2022-08-01

### Changed

- Add `web2cit-server` prefix to User Agent for outgoing HTTP requests.

## [1.0.0] - 2022-07-26

### Added

- First version to be deployed at https://web2cit.toolforge.org/.


[unreleased]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/compare/v1.1.0-beta.1...v1.1
[1.1.0-beta.1]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/compare/v1.1.0-beta.0...v1.1.0-beta.1
[1.1.0-beta.0]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/compare/v1.1.0-alpha.3...v1.1.0-beta.0
[1.1.0-alpha.3]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/compare/v1.1.0-alpha.2...v1.1.0-alpha.3
[1.1.0-alpha.2]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/compare/v1.1.0-alpha.1...v1.1.0-alpha.2
[1.1.0-alpha.1]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/compare/v1.1.0-alpha.0...v1.1.0-alpha.1
[1.1.0-alpha.0]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/compare/v1.0.4...v1.1.0-alpha.0
[1.0.4]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/compare/v1.0.3...v1.0.4
[1.0.3]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/compare/v1.0.2...v1.0.3
[1.0.2]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/compare/v1.0.1...v1.0.2
[1.0.1]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/compare/v1.0.0...v1.0.1
[1.0.0]: https://gitlab.wikimedia.org/diegodlh/w2c-server/-/tags/v1.0.0

[T321002]: https://phabricator.wikimedia.org/T321002
[T318352]: https://phabricator.wikimedia.org/T318352
[T316937]: https://phabricator.wikimedia.org/T316937
[T305163]: https://phabricator.wikimedia.org/T305163