// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { BaseValidator, Validate } from '@rljson/rljson';

import { describe, expect, it } from 'vitest';

import { DecomposeChart, fromJson } from '../src/converter';

const validate = async (rljson: any) => {
  const v = new Validate();
  v.addValidator(new BaseValidator());
  return v.run(rljson);
};

// These tests surface the "array in source data" gap in the *normal*
// (non-`_types`) processing path.
//
// Plain `it(...)` cases assert the CURRENT (broken) behavior, so they act as
// change-detectors: a real fix will make them fail and force an update.
//
// `it.fails(...)` cases assert the DESIRED behavior; they currently throw, so
// `.fails` keeps the suite green while documenting exactly what is missing.
describe('Array gap (normal processing path)', () => {
  // ── Case A: component pointed directly at an array ────────────────────────
  // The whole array is embedded verbatim as a single component value, while
  // the generated TableCfg column claims it is a scalar `string`. The mismatch
  // is NOT caught by BaseValidator -> silent latent corruption.

  it('A1: array of primitives is embedded with a wrong "string" column type', async () => {
    const json = [{ id: 'car1', tags: ['fast', 'red', 'electric'] }];
    const chart: DecomposeChart = { _sliceId: 'id', tags: ['tags'] };

    const rljson = fromJson(json, chart) as any;

    const row = rljson.tags._data[0];
    const column = rljson.tableCfgs._data
      .find((c: any) => c.key === 'tags')
      .columns.find((c: any) => c.key === 'tags');

    expect(row.tags).toEqual(['fast', 'red', 'electric']); // raw array embedded
    expect(column.type).toBe('string'); // BUG: should be 'jsonArray' (or decomposed)
    expect(await validate(rljson)).toStrictEqual({}); // BUG: corruption not caught
  });

  it('A2: array of objects is embedded (hashed blob), not decomposed', async () => {
    const json = [
      {
        id: 'car1',
        wheels: [
          { SN: 'BOB37382', brand: 'Borbet' },
          { SN: 'BOB37383', brand: 'Borbet' },
        ],
      },
    ];
    const chart: DecomposeChart = { _sliceId: 'id', wheels: ['wheels'] };

    const rljson = fromJson(json, chart) as any;

    const row = rljson.wheels._data[0];
    const column = rljson.tableCfgs._data
      .find((c: any) => c.key === 'wheels')
      .columns.find((c: any) => c.key === 'wheels');

    // Inner objects are hashed in place but stay embedded; no own table/layer.
    expect(Array.isArray(row.wheels)).toBe(true);
    expect(row.wheels[0]).toHaveProperty('_hash');
    expect(rljson.wheel).toBeUndefined(); // no decomposed wheel table
    expect(column.type).toBe('string'); // BUG: type/value mismatch
    expect(await validate(rljson)).toStrictEqual({}); // BUG: corruption not caught
  });

  it.fails('A-desired: an array property should be decomposed or typed jsonArray', async () => {
    const json = [{ id: 'car1', tags: ['fast', 'red'] }];
    const chart: DecomposeChart = { _sliceId: 'id', tags: ['tags'] };

    const rljson = fromJson(json, chart) as any;
    const column = rljson.tableCfgs._data
      .find((c: any) => c.key === 'tags')
      .columns.find((c: any) => c.key === 'tags');

    expect(column.type).toBe('jsonArray');
  });

  // ── Case B: nested path INTO an array ─────────────────────────────────────
  // Traversal cannot index into an array, so the property resolves to null and
  // is silently dropped, leaving an empty component object. No error, no signal.
  // (Side finding: component tables are lower-cased, so `wheelBrand` ->
  // `wheelbrand`.)

  it('B: nested path into an array silently drops the data', async () => {
    const json = [
      {
        id: 'car1',
        wheels: [
          { SN: 'BOB37382', brand: 'Borbet' },
          { SN: 'BOB37383', brand: 'Michelin' },
        ],
      },
    ];
    const chart: DecomposeChart = { _sliceId: 'id', wheelBrand: ['wheels/brand'] };

    const rljson = fromJson(json, chart) as any;

    // Table name is lower-cased; the row is an empty object (data lost).
    const row = rljson.wheelbrand._data[0];
    expect(Object.keys(row)).toEqual(['_hash']); // only the hash, no `brand`
    expect(row.brand).toBeUndefined(); // silent data loss
  });

  it.fails('B-desired: a nested-into-array path should carry the inner values', async () => {
    const json = [
      { id: 'car1', wheels: [{ brand: 'Borbet' }, { brand: 'Michelin' }] },
    ];
    const chart: DecomposeChart = { _sliceId: 'id', wheelBrand: ['wheels/brand'] };

    const rljson = fromJson(json, chart) as any;
    const row = rljson.wheelbrand._data[0];

    expect(row.brand).toEqual(['Borbet', 'Michelin']);
  });
});
