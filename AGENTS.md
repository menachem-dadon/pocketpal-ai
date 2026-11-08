# Agent Instructions

Before opening a pull request:

- `yarn lint`, `yarn typecheck` and `yarn test` pass. PRs with failing CI are not reviewed.
- One logical change, on a feature branch off the latest `main`. Follow the existing pattern for what you're changing; don't add parallel stores, registries or abstractions.
- Edit only `src/locales/en.json`; other locales come from Weblate.
- Run the change on at least one platform (device, simulator or emulator) and say on the PR how you verified it. For visible UI changes, attach screenshots or a recording to the PR. Never claim a check you didn't run.
- E2E builds and specs: `e2e/README.md`. Maintainer workflows, for reference: https://github.com/a-ghorbani/pocketpal-dev-team

## PocketPal Tools releases

- Use the autonomous release process in `TOOLS-EDITION.md`. Finish the changes,
  update the version and Android version code, commit/push, then push the matching
  annotated `vX.Y.Z-tools.N` tag when the user requests an APK release.
- Once the release workflow's preflight succeeds and code verification starts,
  return the commit/tag and run link and end the chat. Continue monitoring only
  when the user explicitly asks. Describe the release as pending until published.
- GitHub handles building, signing and publication. Keep signing credentials in
  the release environment; avoid local APK downloads and signing for releases.
- Device/emulator QA is optional for a release handoff unless the user requests
  it or the pull-request requirements above apply.
