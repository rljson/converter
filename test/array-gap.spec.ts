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

// Behavior of arrays in source data on the *normal* (non-`_types`) processing
// path. A directly-addressed array property is embedded verbatim (NOT
// decomposed) and is now typed `jsonArray` in its TableCfg column. A path that
// tries to reach *into* an array is still unsupported (out of scope).
describe('Array in normal processing path', () => {
  // ── Case A: component pointed directly at an array ────────────────────────
  // The whole array is embedded as a single component value; the generated
  // column type is `jsonArray` so the RLJSON is internally consistent.

  it('A1: array of primitives is embedded and typed jsonArray', async () => {
    const json = [{ id: 'car1', tags: ['fast', 'red', 'electric'] }];
    const chart: DecomposeChart = { _sliceId: 'id', tags: ['tags'] };

    const rljson = fromJson(json, chart) as any;

    const row = rljson.tags._data[0];
    const column = rljson.tableCfgs._data
      .find((c: any) => c.key === 'tags')
      .columns.find((c: any) => c.key === 'tags');

    expect(row.tags).toEqual(['fast', 'red', 'electric']); // embedded, not decomposed
    expect(column.type).toBe('jsonArray'); // correct type (was wrongly 'string')
    expect(await validate(rljson)).toStrictEqual({});
  });

  it('A2: array of objects is embedded (hashed blob) and typed jsonArray', async () => {
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

    expect(Array.isArray(row.wheels)).toBe(true);
    expect(row.wheels[0]).toHaveProperty('_hash'); // embedded, not its own table
    expect(rljson.wheel).toBeUndefined(); // not decomposed into a wheel table
    expect(column.type).toBe('jsonArray');
    expect(await validate(rljson)).toStrictEqual({});
  });

  it('A3: a property absent from the source is typed as scalar (no crash)', async () => {
    // `notes` is declared in the chart but missing in the data; the value
    // resolves to null, so the column falls back to the scalar default rather
    // than throwing while building the TableCfg.
    const json = [{ id: 'car1', tags: ['fast'] }];
    const chart: DecomposeChart = {
      _sliceId: 'id',
      tags: ['tags'],
      notes: ['notes'],
    };

    const rljson = fromJson(json, chart) as any;

    const notesColumn = rljson.tableCfgs._data
      .find((c: any) => c.key === 'notes')
      .columns.find((c: any) => c.key === 'notes');

    expect(notesColumn.type).toBe('string'); // scalar default, not jsonArray
    expect(await validate(rljson)).toStrictEqual({});
  });

  // ── Case B: nested path INTO an array (out of scope) ──────────────────────
  // Traversal cannot index into an array, so the property resolves to null and
  // is silently dropped, leaving an empty component object. This remains
  // unsupported by design — arrays of objects belong in `_types`.
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
