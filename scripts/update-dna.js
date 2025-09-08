/*
 * @license
 * Copyright (c) 2025 Rljson
 *
 * Use of this source code is governed by terms that can be
 * found in the LICENSE file in the root of this package.
 */

// A javascript that downloads the latest documentation and settings from the
// template-project
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { blue, gray, green, red, yellow } from './functions/colors.js';
import { isCleanRepo } from './functions/is-clean-repo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const files = [
  'doc',
  'scripts',
  '.vscode',
  '.gitignore',
  '.npmrc',
  '.npmignore',
  '.prettierignore',
  '.prettierrc',
  'README.contributors.md',
  '.github/workflows/run-tests.yml',
  'test/setup',
];

const filesToBeDeleted = [
  'scripts/update-doc-settings-and-scripts.js',
  'doc/workflows/update-from-template-project.md',
];

const templateRepo = 'https://github.com/rljson/template-project.git';
const localRepoPath = path.resolve(__dirname, '../../template-project');
const ownRepoPath = path.resolve(__dirname, '..');

const mustBeClean = false;

function ensureTemplateRepoUpdated() {
  if (fs.existsSync(localRepoPath)) {
    if (mustBeClean) {
      if (isCleanRepo(localRepoPath)) {
        console.error(blue('../template-project') + red(' is not clean. '));
        console.log(yellow('Please commit or stash your changes.'));
        process.exit(1);
      }

      console.log(gray('Updating existing template-project...'));
      execSync('git fetch', { cwd: localRepoPath, stdio: 'inherit' });
      execSync('git pull', { cwd: localRepoPath, stdio: 'inherit' });
    }
  } else {
    console.log(gray('Cloning template-project into ../'));
    execSync(`git clone ${templateRepo} "${localRepoPath}"`, {
      stdio: 'inherit',
    });
  }
  console.log('Template project is ready at:', localRepoPath);
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function copyFiles() {
  for (const file of files) {
    const src = path.join(localRepoPath, file);
    const dest = path.join(process.cwd(), file);

    if (fs.existsSync(src)) {
      copyRecursive(src, dest);
      console.log(gray('Copied: ' + file));
    } else {
      console.warn(red('Not found in template:', file));
    }
  }
}

function deleteFiles() {
  for (const file of filesToBeDeleted) {
    const filePath = path.join(ownRepoPath, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(gray('Deleted: ' + file));
    }
  }
}

function replaceTemplateProject() {
  const pkgFile = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  const projectName = pkg.name.replace('@rljson/', '');

  const replaceFiles = ['doc/workflows/prepare.md', 'doc/workflows/tools.md'];

  for (const file of replaceFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/template-project/g, projectName);
      fs.writeFileSync(filePath, content);
      console.log(gray('Replaced in: ' + file));
    } else {
      console.warn(red('Not found: ' + file));
    }
  }
}

function main() {
  try {
    ensureTemplateRepoUpdated();
    copyFiles();
    deleteFiles();
    replaceTemplateProject();
    console.log(green('Done.'));
  } catch (err) {
    console.error(red('Error:', err.message));
  }
}

main();
