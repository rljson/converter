/*
 * @license
 * Copyright (c) 2025 Rljson
 *
 * Use of this source code is governed by terms that can be
 * found in the LICENSE file in the root of this package.
 */

import { blue, red } from './functions/colors.js';
import { pullRequestUrl } from './functions/pull-request-url.js';

function getPullRequestUrl() {
  try {
    const url = pullRequestUrl();
    console.log(blue(url));
  } catch (error) {
    console.error(red('No PR available'));
    process.exit(1);
  }
}

function main() {
  getPullRequestUrl();
}

main();
