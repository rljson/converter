// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { describe, expect, it } from 'vitest';

import { RljsonConverter } from '../src/rljson-converter';


describe('RljsonConverter', () => {
  it('should validate a template', () => {
    const rljsonConverter = RljsonConverter.example;
    expect(rljsonConverter).toBeDefined();
  });
});
