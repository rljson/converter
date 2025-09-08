// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { describe, expect, it } from 'vitest';

import { TemplateProject } from '../src/template-project';


describe('TemplateProject', () => {
  it('should validate a template', () => {
    const templateProject = TemplateProject.example;
    expect(templateProject).toBeDefined();
  });
});
