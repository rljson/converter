/*
 * @license
 * Copyright (c) 2025 Rljson
 *
 * Use of this source code is governed by terms that can be
 * found in the LICENSE file in the root of this package.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { blue, green, red, yellow } from './functions/colors.js';

// Enable __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command-line arguments

const [, , source, destination] = process.argv;

if (!source || !destination) {
  console.error(red('⚠️  Please provide source and destination file paths.'));
  console.error(blue('Example:'));
  console.error(
    yellow(
      'node scripts/copy-file.js ./source/file.txt ./destination/file.txt',
    ),
  );
  process.exit(1);
}

const sourcePath = path.resolve(source);
let destinationPath = path.resolve(destination);

// If sourcePath does not exist or is not a file, exit
try {
  const sourceStats = await fs.stat(sourcePath);
  if (!sourceStats.isFile()) {
    console.error(red('❌ Source path is not a file:'), blue(sourcePath));
    process.exit(1);
  }
} catch (err) {
  console.error(red('❌ Source path does not exist:'), blue(sourcePath));
  process.exit(1);
}

// If destinationPath is a directory, append source file name to it
try {
  const destinationStats = await fs.stat(destinationPath);
  if (destinationStats.isDirectory()) {
    const sourceFileName = path.basename(sourcePath);
    destinationPath = path.resolve(path.join(destinationPath, sourceFileName));
  }
} catch (err) {
  // Do nothing
}

// If destinationPath is a file, check if its parent directory exists
const destinationDir = path.dirname(destinationPath);
try {
  await fs.access(destinationDir);
} catch (err) {
  console.error(
    red('❌ Destination directory does not exist:\n') + blue(destinationDir),
  );
  process.exit(1);
}

try {
  await fs.copyFile(sourcePath, destinationPath);

  const cwd = process.cwd();
  const sourceRelative = path.relative(cwd, sourcePath);
  const destinationRelative = path.relative(cwd, destinationPath);

  console.log(
    green(`✅ File copied successfully from `) +
      blue(`"${sourceRelative}"`) +
      green(` to `) +
      blue(`"${destinationRelative}"`),
  );
} catch (err) {
  console.error(red('❌ Error while copying file:', err.message));
  process.exit(1);
}
