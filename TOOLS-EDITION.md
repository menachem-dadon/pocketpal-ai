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
- Version: `1.22.1-tools.1` (Android version code 160)
- Model download links: `pocketpaltools://hub/run?repo_id=author/model`

The original `com.pocketpalai` application can stay installed. Each edition has
its own private storage, settings and downloaded models. The native Java package
(`com.pocketpal`) is intentionally unchanged; Android uses the application ID
to separate installations and provider authorities.

Firebase benchmark/feedback submission needs a new `google-services.json` with
a client for this application ID. The upstream Firebase identity is not reused.
Local chat and tools do not need Firebase.

Run `yarn lint`, `yarn typecheck`, and `yarn test --runInBand` before packaging.
The **PocketPal Tools APK** workflow builds a standalone arm64/x86_64 APK after
these checks. Workflow artifacts use the repository's development signing
fallback; published release APKs are signed separately with the edition's local
release key. Keep that private key to install future updates over this edition.
