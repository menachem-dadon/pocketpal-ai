# PocketPal Tools for Android

This edition replaces Pals with a global Tools screen. The switches apply to
every conversation on its next message, including imported conversations. Only
web search, website reading and date/time start enabled. Calculation and HTML
rendering start disabled. Web search and website reading retain the existing
provider configuration and consent requirements in Settings.

Chat selection lists models only. Pal prompts, generation overrides, greetings,
video mode and marketplace navigation are inactive. The app opens directly into
chat; use Models to download or import a model. Legacy Pal data remains in the
storage format so old conversation files can still be read.

- Android application ID: `com.menachem.pocketpal.tools`
- Launcher name: **PocketPal Tools**
- Version: `1.22.1-tools.2` (Android version code 161)
- Model download links: `pocketpaltools://hub/run?repo_id=author/model`

The original `com.pocketpalai` application can stay installed. Each edition has
its own private storage, settings and downloaded models. The native Java package
(`com.pocketpal`) is intentionally unchanged; Android uses the application ID
to separate installations and provider authorities.

Firebase benchmark/feedback submission needs a new `google-services.json` with
a client for this application ID. The upstream Firebase identity is not reused.
Local chat and tools do not need Firebase.
The optional native App Check package is registered only when the default
Firebase app has been initialized. This prevents its eager constructor from
crashing startup in installations without a matching Firebase configuration.

## Publishing an update

The **PocketPal Tools release** workflow handles verification, Android building,
signing and publication without an active agent or a local APK download.

1. Complete the app changes on the feature branch. Update `package.json`,
   `.version` and Android `versionName` together, and increase Android
   `versionCode` above every published Tools version.
2. Commit and push. Create an annotated tag matching the version, for example
   `v1.22.1-tools.2`, on that exact commit and push the tag. A normal branch push
   does not start a Tools APK build.
3. Check the workflow's **preflight** job. After it succeeds and verification
   starts, hand off the run link and end the chat. Follow the run to completion
   only if the user explicitly requests continued monitoring.

The release pipeline requires lint, TypeScript and unit tests to pass before
the Android build. It verifies native libraries and DSP assets, performs a short
cold-launch check on an Android emulator, signs the APK,
checks the fixed Tools certificate fingerprint, package ID and version, then
creates and publishes the release. A failed job prevents publication. The
existing tag is required, and published versions are never overwritten.

Signing credentials live in the `pocketpal-tools-release` GitHub environment:
`TOOLS_KEYSTORE_BASE64`, `TOOLS_STORE_PASSWORD`, `TOOLS_KEY_PASSWORD` and
`TOOLS_KEY_ALIAS`. Only the signing/publication job receives them. Environment
rules allow Tools release and validation tags. Keep the local private-key
backup; updates must retain the same signing identity. Temporary runner key
files are removed after signing. Intermediate artifacts expire after seven days.

For unchanged native dependencies, patches and build inputs, the workflow
verifies and reuses inference cores from a matching published Tools APK. JNI
wrappers and the app are rebuilt. Changed native inputs select a full source
build with the pinned Hexagon SDK. Gradle and CMake caches also help reruns;
their availability depends on GitHub's cache scope and retention. There is no
dependency on an upstream workflow artifact or a fixed historical commit.

## Checking the release automation

Push a unique annotated tag such as `tools-ci-check-20261108-1`. This runs a
short validation using the latest published Tools APK, verifies the native
payload, signs with the environment key and uploads a **draft** validation
release. It does not compile the app or run device tests, and does not publish
an application update. The draft's metadata identifies the original APK source
and the workflow commit separately. The optional manual `source_release` input
can select another published Tools APK; manual runs must also select a tag.

The normal release path still runs all code checks and builds the new source.
The cold-launch check installs the resulting APK, watches the process for
15 seconds and checks Android's crash log. Startup logs and a screenshot are
retained with the run. This check is independent of an active chat; full UI,
model and device testing remains optional.
