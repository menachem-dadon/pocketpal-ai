#!/usr/bin/env node
// Release preflight shared by the workflow and its local checks.
const {execFileSync} = require('child_process');
const {createHash} = require('crypto');
const fs = require('fs');

const RELEASE_TAG = /^v\d+\.\d+\.\d+-tools\.\d+$/;
const CHECK_TAG = /^tools-ci-check-[a-zA-Z0-9.-]+$/;
const NATIVE_INPUTS = [
  'yarn.lock',
  'patches',
  'android/build.gradle',
  'android/gradle.properties',
  'android/gradle/wrapper/gradle-wrapper.properties',
  'scripts/android-payload-manifest.json',
  'scripts/postinstall.sh',
  '.github/actions/setup-hexagon-sdk',
];
const CERTIFICATE =
  'a3868e6f52970387607b63304499a9549b3d9f4053d3c22171b3c03beebef219';

function run(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function nativeFingerprint(ref) {
  const tree = run('git', ['ls-tree', '-r', ref, '--', ...NATIVE_INPUTS]);
  if (!tree.includes('yarn.lock')) {
    throw new Error('Missing native dependency inputs');
  }
  const packageConfig = JSON.parse(run('git', ['show', `${ref}:package.json`]));
  delete packageConfig.version;
  // Bump this contract if compiler flags, ABIs or build tools change outside
  // the tracked native inputs. App/UI and version changes keep the same key.
  return createHash('sha256')
    .update(
      'tools-native-v1/ubuntu24/ndk27.3.13750724/cmake3.22.1/arm64+x86_64\n',
    )
    .update(tree)
    .update(JSON.stringify(packageConfig))
    .digest('hex');
}

function sourceInfo(ref) {
  const pkg = JSON.parse(run('git', ['show', `${ref}:package.json`]));
  const versionFile = run('git', ['show', `${ref}:.version`]);
  const gradle = run('git', ['show', `${ref}:android/app/build.gradle`]);
  const version = gradle.match(/\bversionName\s+"([^"]+)"/)?.[1];
  const versionCode = Number(gradle.match(/\bversionCode\s+(\d+)/)?.[1]);
  if (
    pkg.version !== version ||
    versionFile !== version ||
    !Number.isSafeInteger(versionCode) ||
    versionCode < 1
  ) {
    throw new Error('package.json, .version and Android versions must agree');
  }
  return {
    version,
    versionCode,
    sourceCommit: run('git', ['rev-parse', `${ref}^{commit}`]),
    nativeFingerprint: nativeFingerprint(ref),
    packageId: 'com.menachem.pocketpal.tools',
    signingCertificateSha256: CERTIFICATE,
  };
}

function publishedReleases() {
  return JSON.parse(
    run('gh', [
      'release',
      'list',
      '--repo',
      process.env.GITHUB_REPOSITORY,
      '--limit',
      '100',
      '--json',
      'tagName,isDraft',
    ]),
  ).filter(release => !release.isDraft && RELEASE_TAG.test(release.tagName));
}

function preflight() {
  const tag = process.env.GITHUB_REF_NAME || '';
  if (
    process.env.GITHUB_REF_TYPE !== 'tag' ||
    (!RELEASE_TAG.test(tag) && !CHECK_TAG.test(tag))
  ) {
    throw new Error('Run on a vX.Y.Z-tools.N or tools-ci-check-* tag');
  }
  const current = sourceInfo('HEAD');
  if (current.sourceCommit !== run('git', ['rev-parse', `${tag}^{commit}`])) {
    throw new Error('Checkout does not match the requested tag');
  }
  const mode = CHECK_TAG.test(tag) ? 'validate' : 'release';
  const releases = publishedReleases();
  if (mode === 'release') {
    if (tag !== `v${current.version}`) {
      throw new Error('Release tag must match the application version');
    }
    if (releases.some(release => release.tagName === tag)) {
      throw new Error('This version is already published; bump the version');
    }
    for (const release of releases) {
      if (current.versionCode <= sourceInfo(release.tagName).versionCode) {
        throw new Error(
          'Android versionCode must exceed published Tools versions',
        );
      }
    }
  }
  const requestedSource = process.env.TOOLS_SOURCE_RELEASE;
  const sourceRelease = requestedSource || releases[0]?.tagName;
  if (mode === 'validate' && !releases.some(r => r.tagName === sourceRelease)) {
    throw new Error('Validation requires an existing published Tools release');
  }
  const info = mode === 'validate' ? sourceInfo(sourceRelease) : current;
  let nativeRelease = '';
  for (const release of releases.slice(0, 20)) {
    if (
      sourceInfo(release.tagName).nativeFingerprint ===
      current.nativeFingerprint
    ) {
      nativeRelease = release.tagName;
      break;
    }
  }
  const metadata = {
    ...info,
    tag,
    workflowCommit: current.sourceCommit,
    validationOnly: mode === 'validate',
  };
  fs.writeFileSync(
    'release-info.json',
    JSON.stringify(metadata, null, 2) + '\n',
  );
  const outputs = {
    mode,
    version: info.version,
    version_code: info.versionCode,
    source_release: mode === 'validate' ? sourceRelease : '',
    native_release: nativeRelease,
    native_key: current.nativeFingerprint,
  };
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(outputs)
      .map(([key, value]) => `${key}=${value}\n`)
      .join(''),
  );
  console.log(
    `Preflight passed: ${mode}, ${tag}, native source ${nativeRelease || 'fresh build'}`,
  );
}

if (require.main === module) {
  try {
    preflight();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {RELEASE_TAG, CHECK_TAG, nativeFingerprint, sourceInfo};
