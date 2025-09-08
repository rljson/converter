/*
 * @license
 * Copyright (c) 2025 Rljson
 *
 * Use of this source code is governed by terms that can be
 * found in the LICENSE file in the root of this package.
 */

import { execSync } from 'child_process';
import { gray, green, red } from './functions/colors.js';
import { getVersion } from './functions/get-version.js';
import { isCleanRepo } from './functions/is-clean-repo.js';
import { isMainUpToDate } from './functions/is-main-up-to-date.js';

const createVersionTag = (version) => {
  try {
    execSync(`git tag v${version}`);
    execSync(`git push origin v${version}`);
    console.log(green(`Tag v${version} created and pushed successfully.`));
  } catch (error) {
    console.error(
      red('Error creating or pushing tag\n'),
      gray(error.message.trim()),
    );
  }
};

const main = async () => {
  if (!isCleanRepo()) {
    console.error(red('You must be on a clean main branch.'));
    process.exit(1);
  }

  if (!isMainUpToDate()) {
    console.error(red('Main branch is not up to date with origin/main.'));
    process.exit(1);
  }

  const version = await getVersion();
  createVersionTag(version);
};

main().catch(console.error);
