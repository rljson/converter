// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { describe, expect, it } from 'vitest';

import { Converter } from '../src/converter';

describe('Converter', () => {
  it('should validate a template', () => {
    const converter = Converter.example;
    expect(converter).toBeDefined();
  });
});
