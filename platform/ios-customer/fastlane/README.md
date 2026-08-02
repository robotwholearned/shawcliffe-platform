fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios build_simulator

```sh
[bundle exec] fastlane ios build_simulator
```

Build for the iOS Simulator — no code signing needed. Params: client_id:, slug:, bundle_id:, app_name:

### ios build

```sh
[bundle exec] fastlane ios build
```

Build a signed, distributable per-client IPA. Same params as build_simulator. NOT yet usable — needs a configured Apple Developer Organization account and code signing (certs/provisioning profiles), both blocked on D-U-N-S verification.

### ios demo_testflight

```sh
[bundle exec] fastlane ios demo_testflight
```

Build + upload the single 'Shawcliffe Demos' app to TestFlight (bundle id ca.shawcliffe.demo, DEMO_MODE=YES → in-app picker of all demo businesses). Prerequisites (see platform/supabase/seed/README-demos.md): an App Store Connect app record for ca.shawcliffe.demo, and Apple credentials for signing + upload (Xcode Accounts, or an App Store Connect API key for CI). Does NOT affect Tom's or the per-client builds.

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
