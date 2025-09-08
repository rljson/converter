/*
 * @license
 * Copyright (c) 2025 Rljson
 *
 * Use of this source code is governed by terms that can be
 * found in the LICENSE file in the root of this package.
 */

// publish-and-tag.js
import { gray, green, red } from './functions/colors.js';
import { isCleanRepo } from './functions/is-clean-repo.js';
import { runCommand } from './functions/run-command.js';

(async () => {
  try {
    if (!isCleanRepo()) {
      console.error(red('Branch must be a clean main branch.'));
      process.exit(1);
    }

    console.log(gray('📦 Publishing package...'));
    runCommand('npm publish --access public');
    console.log(green('✅ Publish successful. Adding version tag...'));
    runCommand('node scripts/add-version-tag.js');
    console.log(green('🏷️ Version tag added.'));
  } catch (e) {
    console.error(red('Operation failed: ' + e.error?.message || e));
    process.exit(1);
  }
})();
