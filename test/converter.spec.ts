// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { BaseValidator, Validate } from '@rljson/rljson';

import { describe, expect, it } from 'vitest';

import {
  DecomposeChart,
  exampleFromJsonDecomposeSheet,
  exampleFromJsonJson,
  fromJson,
} from '../src/converter';

import { expectGolden } from './setup/goldens';

describe('From JSON', () => {
  it('Basic object should convert without Error.', async () => {
    const json = {
      id: 'car1',
      model: 'X',
      manufacturer: 'Tesla',
    };

    const chart: DecomposeChart = {
      _sliceId: 'id',
      model: ['model'],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    await expectGolden('example/converter/simple-object.json').toBe(rljson);
    expect(result).toStrictEqual({});
  });
  it('Basic objects List should convert without Error.', async () => {
    const json = [
      {
        id: 'car1',
        model: 'X',
        manufacturer: 'Tesla',
      },
      {
        id: 'car2',
        model: 'Y',
        manufacturer: 'Tesla',
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      model: ['model'],
      manufacturer: ['manufacturer'],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    await expectGolden('example/converter/simple-list.json').toBe(rljson);
    expect(result).toStrictEqual({});
  });
  it('List w/ types but w/o names should throw Error.', async () => {
    const json = [
      {
        id: 'car1',
        model: 'X',
        manufacturer: 'Tesla',
        color: {
          id: 'RAL9000',
          name: 'Black',
        },
      },
      {
        id: 'car2',
        model: 'Y',
        manufacturer: 'Tesla',
        color: {
          id: 'RAL7000',
          name: 'Gray',
        },
      },
    ];

    expect(() =>
      fromJson(json, {
        _sliceId: 'id',
        model: ['model'],
        manufacturer: ['manufacturer'],
        _types: [
          {
            _path: 'color',
            _sliceId: 'id',
          },
        ],
      }),
    ).toThrowError('If subtypes are defined, _name must be provided!');
  });

  it('List w/ types but duplicate type names should throw Error.', async () => {
    const json = [
      {
        id: 'car1',
        model: 'X',
        manufacturer: 'Tesla',
        color: {
          id: 'RAL9000',
          name: 'Black',
        },
      },
      {
        id: 'car2',
        model: 'Y',
        manufacturer: 'Tesla',
        color: {
          id: 'RAL7000',
          name: 'Gray',
        },
      },
    ];

    expect(() =>
      fromJson(json, {
        _sliceId: 'id',
        _name: 'Car',
        model: ['model'],
        manufacturer: ['manufacturer'],
        _types: [
          {
            _sliceId: 'id',
            _name: 'Car',
            _path: 'color',
          },
        ],
      }),
    ).toThrowError('All _name properties must be unique within one chart!');
  });
  it('List w/ types but duplicate comp names should throw Error.', async () => {
    const json = [
      {
        id: 'car1',
        model: 'X',
        manufacturer: 'Tesla',
        color: {
          id: 'RAL9000',
          name: 'Black',
        },
      },
      {
        id: 'car2',
        model: 'Y',
        manufacturer: 'Tesla',
        color: {
          id: 'RAL7000',
          name: 'Gray',
        },
      },
    ];

    expect(() =>
      fromJson(json, {
        _sliceId: 'id',
        _name: 'Car',
        model: ['model'],
        manufacturer: ['manufacturer'],
        _types: [
          {
            _sliceId: 'id',
            _name: 'Color',
            _path: 'color',
            model: ['name'],
          },
        ],
      }),
    ).toThrowError('All component names must be unique within one chart!');
  });
  it('List w/ types but w/o paths should throw Error.', async () => {
    const json = [
      {
        id: 'car1',
        model: 'X',
        manufacturer: 'Tesla',
        color: {
          id: 'RAL9000',
          name: 'Black',
        },
      },
      {
        id: 'car2',
        model: 'Y',
        manufacturer: 'Tesla',
        color: {
          id: 'RAL7000',
          name: 'Gray',
        },
      },
    ];
    expect(() =>
      fromJson(json, {
        _sliceId: 'id',
        _name: 'Car',
        model: ['model'],
        manufacturer: ['manufacturer'],
        _types: [
          {
            _sliceId: 'id',
            _name: 'Color',
          },
        ],
      }),
    ).toThrowError('If subtypes are defined, _path must be provided!');
  });
  it('List w/ types should convert w/o errors.', async () => {
    const json = [
      {
        id: 'car1',
        model: 'X',
        manufacturer: 'Tesla',
        color: {
          id: 'RAL9000',
          name: 'Black',
        },
      },
      {
        id: 'car2',
        model: 'Y',
        manufacturer: 'Tesla',
        color: {
          id: 'RAL7000',
          name: 'Gray',
        },
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      _name: 'Car',
      model: ['model'],
      manufacturer: ['manufacturer'],
      _types: [
        {
          _name: 'Color',
          _path: 'color',
          _sliceId: 'id',
          genereral: ['name'],
        },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    await expectGolden('example/converter/list-with-types.json').toBe(rljson);
    expect(result).toStrictEqual({});
  });
  it('List w/ types and multilateral references should convert w/o errors.', async () => {
    const json = [
      {
        id: 'car1',
        model: 'X',
        manufacturer: 'Tesla',
        screws: [
          {
            id: 'SCW-001',
            type: 'DIN7984',
            material: 'Stainless Steel',
            dimension: 'M4x20',
          },
          {
            id: 'SCW-001',
            type: 'DIN7984',
            material: 'Stainless Steel',
            dimension: 'M4x20',
          },
          {
            id: 'SCW-002',
            type: 'DIN7990',
            material: 'Steel Zinc plated',
            dimension: 'M6x30',
          },
        ],
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      _name: 'Car',
      meta: ['model', 'manufacturer'],
      screwRefs: ['sliceId@Screw', 'technicalRef@Screw'],
      _types: [
        {
          _name: 'Screw',
          _path: 'screws',
          _sliceId: 'id',
          technical: ['type', 'material', 'dimension'],
        },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    await expectGolden('example/converter/list-with-types-multi-ref.json').toBe(
      rljson,
    );
    //Validation skipped, because RLJSON needs multi-ref for sliceIds
    //expect(result).toStrictEqual({});
  });
  it('List w/ types and references should convert w/o errors.', async () => {
    const json = [
      {
        id: 'car1',
        color: {
          id: 'RAL9000',
          name: 'Black',
        },
      },
      {
        id: 'car2',
        color: {
          id: 'RAL7000',
          name: 'Gray',
        },
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      _name: 'Car',
      colorRefs: ['colorSliceId', 'colorGeneralRef'],
      _types: [
        {
          _name: 'Color',
          _path: 'color',
          _sliceId: 'id',
          general: ['name'],
        },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    await expectGolden('example/converter/list-with-types-and-refs.json').toBe(
      rljson,
    );
    expect(result).toStrictEqual({});
  });
  it('Object with nested components should convert w/o errors.', async () => {
    const json = {
      id: 'car1',
      model: 'X',
      manufacturer: 'Tesla',
      registration: {
        country: 'D',
        licensePlate: 'B-TX-100',
      },
      dimension: {
        length: 5036,
        width: 1999,
        height: 1684,
      },
    };
    const chart: DecomposeChart = {
      _sliceId: 'id',
      info: ['model', 'manufacturer'],
      registration: ['registration/country', 'registration/licensePlate'],
      dimension: {
        length: ['dimension/length'],
        width: ['dimension/width'],
        height: ['dimension/height'],
      },
      brand: [{ origin: 'manufacturer', destination: 'brand' }],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    expect(Object.keys(rljson)).toEqual([
      'sliceId',
      'info',
      'registration',
      'length',
      'width',
      'height',
      'dimension',
      'brand',
      'infoLayer',
      'registrationLayer',
      'lengthLayer',
      'widthLayer',
      'heightLayer',
      'dimensionLayer',
      'brandLayer',
      'cake',
    ]);

    await expectGolden('example/converter/component-encapsulation.json').toBe(
      rljson,
    );
    expect(result).toStrictEqual({});
  });

  it('Object with nested components but skipping layers should convert w/o errors.', async () => {
    const json = {
      id: 'car1',
      model: 'X',
      manufacturer: 'Tesla',
      registration: {
        country: 'D',
        licensePlate: 'B-TX-100',
      },
      dimension: {
        length: 5036,
        width: 1999,
        height: 1684,
      },
    };
    const chart: DecomposeChart = {
      _sliceId: 'id',
      _skipLayerCreation: ['length', 'width', 'height'],
      dimension: {
        length: ['dimension/length'],
        width: ['dimension/width'],
        height: ['dimension/height'],
      },
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    expect(Object.keys(rljson)).toEqual([
      'sliceId',
      'length',
      'width',
      'height',
      'dimension',
      'dimensionLayer',
      'cake',
    ]);

    await expectGolden(
      'example/converter/component-encapsulation-with-skipping.json',
    ).toBe(rljson);
    expect(result).toStrictEqual({});
  });

  it('Example should convert w/o errors.', async () => {
    const json = exampleFromJsonJson;
    const decomposeSheet = exampleFromJsonDecomposeSheet;

    const rljson = fromJson(json, decomposeSheet);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    await expectGolden('example/converter/converter-example.json').toBe(rljson);
    expect(result).toStrictEqual({});
  });
});
