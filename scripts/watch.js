/**
 * Watch Script for Development
 * Watches for file changes and rebuilds automatically
 */

const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');

const ROOT_DIR = path.join(__dirname, '..');
const BUILD_DIR = path.join(ROOT_DIR, 'dist');

const WATCH_PATTERNS = [
  'manifest.json',
  '*.js',
  '*.html',
  '*.css',
  'src/**/*',
  'icons/**/*',
];

const IGNORE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'tests/**',
  'scripts/**',
  '*.test.js',
];

async function copyFile(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  const destPath = path.join(BUILD_DIR, relativePath);

  try {
    await fs.ensureDir(path.dirname(destPath));
    await fs.copy(filePath, destPath);
    console.log(`  ✓ Updated ${relativePath}`);
  } catch (error) {
    console.error(`  ✗ Failed to copy ${relativePath}:`, error.message);
  }
}

async function removeFile(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  const destPath = path.join(BUILD_DIR, relativePath);

  try {
    await fs.remove(destPath);
    console.log(`  ✓ Removed ${relativePath}`);
  } catch (error) {
    console.error(`  ✗ Failed to remove ${relativePath}:`, error.message);
  }
}

async function initialBuild() {
  console.log('🏗️  Performing initial build...\n');
  const { execSync } = require('child_process');
  execSync('node scripts/build.js', { stdio: 'inherit' });
  console.log('\n👀 Watching for changes...\n');
}

async function watch() {
  await initialBuild();

  const watcher = chokidar.watch(WATCH_PATTERNS, {
    ignored: IGNORE_PATTERNS,
    persistent: true,
    ignoreInitial: true,
    cwd: ROOT_DIR,
  });

  watcher
    .on('add', (filePath) => {
      console.log(`📝 File added: ${filePath}`);
      copyFile(path.join(ROOT_DIR, filePath));
    })
    .on('change', (filePath) => {
      console.log(`📝 File changed: ${filePath}`);
      copyFile(path.join(ROOT_DIR, filePath));
    })
    .on('unlink', (filePath) => {
      console.log(`📝 File removed: ${filePath}`);
      removeFile(path.join(ROOT_DIR, filePath));
    });

  console.log('✨ Watch mode active. Press Ctrl+C to stop.');
}

// 実行
watch().catch((error) => {
  console.error('❌ Watch failed:', error);
  process.exit(1);
});
