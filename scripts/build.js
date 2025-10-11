/**
 * Build Script for Chrome Extension
 * Copies files to dist/ directory and optionally creates a zip
 */

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

const BUILD_DIR = path.join(__dirname, '..', 'dist');
const ROOT_DIR = path.join(__dirname, '..');

// ビルドに含めるファイル・ディレクトリ
const FILES_TO_COPY = [
  'manifest.json',
  'background.js',
  'content.js',
  'injected.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'utils.js',
  'icons',
];

// src/ からコピーするファイル（新構造用）
const SRC_FILES = [
  'src/background',
  'src/content',
  'src/popup',
  'src/utils',
];

async function clean() {
  console.log('🧹 Cleaning build directory...');
  await fs.remove(BUILD_DIR);
  await fs.ensureDir(BUILD_DIR);
}

async function copyFiles() {
  console.log('📦 Copying files...');

  for (const file of FILES_TO_COPY) {
    const src = path.join(ROOT_DIR, file);
    const dest = path.join(BUILD_DIR, file);

    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
      console.log(`  ✓ Copied ${file}`);
    } else {
      console.log(`  ⚠ Skipped ${file} (not found)`);
    }
  }

  // src/ からもコピー（将来の構造用）
  for (const dir of SRC_FILES) {
    const src = path.join(ROOT_DIR, dir);
    if (await fs.pathExists(src)) {
      const dest = path.join(BUILD_DIR, dir);
      await fs.copy(src, dest);
      console.log(`  ✓ Copied ${dir}`);
    }
  }
}

async function createZip() {
  return new Promise((resolve, reject) => {
    console.log('🗜️  Creating zip archive...');

    const manifest = require(path.join(ROOT_DIR, 'manifest.json'));
    const version = manifest.version;
    const zipPath = path.join(ROOT_DIR, `yt-music-playlist-ext-v${version}.zip`);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✓ Created ${path.basename(zipPath)} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(BUILD_DIR, false);
    archive.finalize();
  });
}

async function build() {
  try {
    console.log('🚀 Starting build process...\n');

    await clean();
    await copyFiles();

    const shouldZip = process.argv.includes('--zip');
    if (shouldZip) {
      await createZip();
    }

    console.log('\n✨ Build completed successfully!');
    console.log(`📂 Output: ${BUILD_DIR}`);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// 実行
build();
