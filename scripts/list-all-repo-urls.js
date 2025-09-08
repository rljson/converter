/*
 * @license
 * Copyright (c) 2025 Rljson
 *
 * Use of this source code is governed by terms that can be
 * found in the LICENSE file in the root of this package.
 */

// Import Node.js built-in module for working with child processes
import { getRepoUrls } from './functions/get-repo-urls.js';

const repos = await getRepoUrls();
for (const repo of repos) {
  console.log(repo);
}
