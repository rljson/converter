// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { BaseValidator, removeDuplicates, Validate } from '@rljson/rljson';

import { describe, expect, it } from 'vitest';

import {
  DecomposeChart,
  DecomposeChartComponentPropertyDef,
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
  it('Basic objects List w/ typed Components should convert w/o errors.', async () => {
    const json = [
      {
        id: 'car1',
        model: 'X',
        manufacturer: 'Tesla',
        length: 5036,
        width: 1999,
        height: 1684,
      },
      {
        id: 'car2',
        model: 'Y',
        manufacturer: 'Tesla',
        length: 4751,
        width: 1921,
        height: 1624,
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      model: ['model'],
      manufacturer: ['manufacturer'],
      dimensions: [
        {
          origin: 'length',
          destination: 'length',
          type: 'number',
        } as DecomposeChartComponentPropertyDef,
        {
          origin: 'width',
          destination: 'width',
          type: 'number',
        } as DecomposeChartComponentPropertyDef,
        {
          origin: 'height',
          destination: 'height',
          type: 'number',
        } as DecomposeChartComponentPropertyDef,
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    await expectGolden(
      'example/converter/simple-list-typed-components.json',
    ).toBe(rljson);
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
    ).toThrowError(
      'All component names must be unique within one chart! ' +
        'Duplicate component names: model',
    );
  });
  it('List w/ types but multiple duplicate comp names should name each duplicate once.', async () => {
    const json = [
      {
        id: 'car1',
        model: 'X',
        manufacturer: 'Tesla',
        color: {
          id: 'RAL9000',
          name: 'Black',
          manufacturer: 'ColorCorp',
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
            manufacturer: ['manufacturer'],
          },
        ],
      }),
    ).toThrowError(
      'All component names must be unique within one chart! ' +
        'Duplicate component names: model, manufacturer',
    );
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
      screwRefs: ['sliceId@Screw', 'technical@Screw'],
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
    const valid = await v.run(rljson);

    await expectGolden('example/converter/list-with-types-multi-ref.json').toBe(
      rljson,
    );

    expect(valid).toStrictEqual({});
  });

  it('List w/ types and named multilateral references should convert w/o errors.', async () => {
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
      screwRefs: [
        'sliceId@Screw',
        'technical@Screw',
        { origin: 'sliceId@Screw', destination: 'pointToScrewIds' },
        { origin: 'technical@Screw', destination: 'pointToScrewTechnical' },
      ],
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
    const valid = await v.run(rljson);

    await expectGolden(
      'example/converter/list-with-types-named-multi-ref.json',
    ).toBe(rljson);

    expect(valid).toStrictEqual({});
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
      colorRefs: ['sliceId@Color', 'general@Color'],
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
      brand: [
        { origin: 'manufacturer', destination: 'brand' },
        { origin: 'model', destination: 'type' },
      ],
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
      'infoInsertHistory',
      'registrationInsertHistory',
      'lengthInsertHistory',
      'widthInsertHistory',
      'heightInsertHistory',
      'dimensionInsertHistory',
      'brandInsertHistory',
      'infoLayerInsertHistory',
      'registrationLayerInsertHistory',
      'lengthLayerInsertHistory',
      'widthLayerInsertHistory',
      'heightLayerInsertHistory',
      'dimensionLayerInsertHistory',
      'brandLayerInsertHistory',
      'cakeInsertHistory',
      'sliceIdInsertHistory',
      'cakeEdits',
      'cakeMultiEdits',
      'cakeEditHistory',
      'cake',
      'tableCfgs',
      '_hash',
    ]);

    await expectGolden('example/converter/component-encapsulation.json').toBe(
      rljson,
    );
    expect(result).toStrictEqual({});
  });

  it('Object with nested components and named type should convert w/o errors.', async () => {
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
      _name: 'Car',
      info: ['model', 'manufacturer'],
      registration: ['registration/country', 'registration/licensePlate'],
      dimension: {
        length: ['dimension/length'],
        width: ['dimension/width'],
        height: ['dimension/height'],
      },
      brand: [
        { origin: 'manufacturer', destination: 'brand' },
        { origin: 'model', destination: 'type' },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    expect(Object.keys(rljson)).toEqual([
      'carSliceId',
      'carInfo',
      'carRegistration',
      'carLength',
      'carWidth',
      'carHeight',
      'carDimension',
      'carBrand',
      'carInfoLayer',
      'carRegistrationLayer',
      'carLengthLayer',
      'carWidthLayer',
      'carHeightLayer',
      'carDimensionLayer',
      'carBrandLayer',
      'carInfoInsertHistory',
      'carRegistrationInsertHistory',
      'carLengthInsertHistory',
      'carWidthInsertHistory',
      'carHeightInsertHistory',
      'carDimensionInsertHistory',
      'carBrandInsertHistory',
      'carInfoLayerInsertHistory',
      'carRegistrationLayerInsertHistory',
      'carLengthLayerInsertHistory',
      'carWidthLayerInsertHistory',
      'carHeightLayerInsertHistory',
      'carDimensionLayerInsertHistory',
      'carBrandLayerInsertHistory',
      'carCakeInsertHistory',
      'carSliceIdInsertHistory',
      'carCakeEdits',
      'carCakeMultiEdits',
      'carCakeEditHistory',
      'carCake',
      'tableCfgs',
      '_hash',
    ]);

    await expectGolden(
      'example/converter/component-encapsulation-with-named-type.json',
    ).toBe(rljson);
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
      'lengthInsertHistory',
      'widthInsertHistory',
      'heightInsertHistory',
      'dimensionInsertHistory',
      'dimensionLayerInsertHistory',
      'cakeInsertHistory',
      'sliceIdInsertHistory',
      'cakeEdits',
      'cakeMultiEdits',
      'cakeEditHistory',
      'cake',
      'tableCfgs',
      '_hash',
    ]);

    await expectGolden(
      'example/converter/component-encapsulation-with-skipping.json',
    ).toBe(rljson);
    expect(result).toStrictEqual({});
  });
  it('Named Object with nested components but skipping layers should convert w/o errors.', async () => {
    const json = [
      {
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
      },
      {
        id: 'car2',
        model: 'Y',
        manufacturer: 'Tesla',
        registration: {
          country: 'D',
          licensePlate: 'B-TY-200',
        },
        dimension: {
          length: 4751,
          width: 1921,
          height: 1624,
        },
      },
    ];
    const chart: DecomposeChart = {
      _name: 'Car',
      _sliceId: 'id',
      _skipLayerCreation: ['length', 'width', 'height'],
      manufacturer: ['manufacturer'],
      dimension: {
        length: ['dimension/length'],
        width: ['dimension/width'],
        height: ['dimension/height'],
      },
    };

    const rljson = fromJson(json, chart);
    removeDuplicates(rljson);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    expect(Object.keys(rljson)).toEqual([
      'carSliceId',
      'carManufacturer',
      'carLength',
      'carWidth',
      'carHeight',
      'carDimension',
      'carManufacturerLayer',
      'carDimensionLayer',
      'carManufacturerInsertHistory',
      'carLengthInsertHistory',
      'carWidthInsertHistory',
      'carHeightInsertHistory',
      'carDimensionInsertHistory',
      'carManufacturerLayerInsertHistory',
      'carDimensionLayerInsertHistory',
      'carCakeInsertHistory',
      'carSliceIdInsertHistory',
      'carCakeEdits',
      'carCakeMultiEdits',
      'carCakeEditHistory',
      'carCake',
      'tableCfgs',
      '_hash',
    ]);

    await expectGolden(
      'example/converter/component-named-encapsulation-with-skipping.json',
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

  it('Array-valued properties are embedded as-is and typed jsonArray.', async () => {
    // Arrays addressed directly through a normal-path component are embedded
    // verbatim (NOT decomposed) and their TableCfg column is typed `jsonArray`.
    // Both arrays of primitives (`tags`) and arrays of objects (`wheels`) are
    // supported this way.
    const json = [
      {
        id: 'car1',
        tags: ['fast', 'red'],
        wheels: [
          { SN: 'BOB37382', brand: 'Borbet' },
          { SN: 'BOB37383', brand: 'Michelin' },
        ],
      },
      {
        id: 'car2',
        tags: ['eco'],
        wheels: [{ SN: 'BOB37384', brand: 'Borbet' }],
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      tags: ['tags'],
      wheels: ['wheels'],
    };

    const rljson = fromJson(json, chart);

    // The arrays are embedded unchanged in their components.
    expect((rljson as any).tags._data[0].tags).toEqual(['fast', 'red']);
    expect((rljson as any).wheels._data[0].wheels).toHaveLength(2);

    // Both component columns are typed `jsonArray`.
    const columnType = (table: string) =>
      (rljson as any).tableCfgs._data
        .find((c: any) => c.key === table)
        .columns.find((c: any) => c.key === table).type;
    expect(columnType('tags')).toBe('jsonArray');
    expect(columnType('wheels')).toBe('jsonArray');

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    await expectGolden('example/converter/array-as-is.json').toBe(rljson);
    expect(result).toStrictEqual({});
  });

  it('Basic object with nested sliceId should convert without Error.', async () => {
    const json = {
      meta: { id: 'car1' },
      model: 'X',
      manufacturer: 'Tesla',
    };

    const chart: DecomposeChart = {
      _sliceId: 'meta/id',
      model: ['model'],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    // Backwards compatibility: a nested sliceId must produce byte-identical
    // RLJSON to the flat equivalent that points at the same resolved value.
    const flatRljson = fromJson(
      { id: 'car1', model: 'X', manufacturer: 'Tesla' },
      { _sliceId: 'id', model: ['model'] },
    );

    expect(rljson).toStrictEqual(flatRljson);
    await expectGolden(
      'example/converter/simple-object-nested-slice-id.json',
    ).toBe(rljson);
    expect(result).toStrictEqual({});
  });

  it('Basic objects List with nested sliceId should convert without Error.', async () => {
    const json = [
      {
        meta: { id: 'car1' },
        model: 'X',
        manufacturer: 'Tesla',
      },
      {
        meta: { id: 'car2' },
        model: 'Y',
        manufacturer: 'Tesla',
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'meta/id',
      model: ['model'],
      manufacturer: ['manufacturer'],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    // Backwards compatibility: identical to the flat-sliceId equivalent.
    const flatRljson = fromJson(
      [
        { id: 'car1', model: 'X', manufacturer: 'Tesla' },
        { id: 'car2', model: 'Y', manufacturer: 'Tesla' },
      ],
      { _sliceId: 'id', model: ['model'], manufacturer: ['manufacturer'] },
    );

    expect(rljson).toStrictEqual(flatRljson);
    await expectGolden(
      'example/converter/simple-list-nested-slice-id.json',
    ).toBe(rljson);
    expect(result).toStrictEqual({});
  });

  it('Basic objects List with nested sliceId and unknown string chart entry should convert without Error.', async () => {
    const json = [
      {
        meta: { id: 'car1' },
        model: 'X',
        manufacturer: 'Tesla',
      },
      {
        meta: { id: 'car2' },
        model: 'Y',
        manufacturer: 'Tesla',
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'meta/id',
      model: ['model'],
      manufacturer: ['manufacturer'],
      notthere: ['notthere'],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    expect(result).toStrictEqual({});
  });

  it('Basic objects List with nested sliceId and a missing intermediate object should not throw.', () => {
    const json = [
      {
        meta: { id: 'car1' },
        model: 'X',
      },
      {
        // meta is missing entirely here, so the nested sliceId path
        // 'meta/id' cannot be resolved for this item.
        model: 'Y',
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'meta/id',
      model: ['model'],
    };

    expect(() => fromJson(json, chart)).not.toThrow();
  });

  it('List w/ types and references with nested sliceIds should convert w/o errors.', async () => {
    const json = [
      {
        meta: { vin: 'car1' },
        color: {
          ref: { id: 'RAL9000' },
          name: 'Black',
        },
      },
      {
        meta: { vin: 'car2' },
        color: {
          ref: { id: 'RAL7000' },
          name: 'Gray',
        },
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'meta/vin',
      _name: 'Car',
      colorRefs: ['sliceId@Color', 'general@Color'],
      _types: [
        {
          _name: 'Color',
          _path: 'color',
          _sliceId: 'ref/id',
          general: ['name'],
        },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    // Backwards compatibility: identical to the flat-sliceId equivalent for
    // both the parent type and the referenced sub-type.
    const flatRljson = fromJson(
      [
        { vin: 'car1', color: { id: 'RAL9000', name: 'Black' } },
        { vin: 'car2', color: { id: 'RAL7000', name: 'Gray' } },
      ],
      {
        _sliceId: 'vin',
        _name: 'Car',
        colorRefs: ['sliceId@Color', 'general@Color'],
        _types: [
          {
            _name: 'Color',
            _path: 'color',
            _sliceId: 'id',
            general: ['name'],
          },
        ],
      },
    );

    expect(rljson).toStrictEqual(flatRljson);
    await expectGolden(
      'example/converter/list-with-types-and-refs-nested-slice-id.json',
    ).toBe(rljson);
    expect(result).toStrictEqual({});
  });

  it('List w/ types and references with nested sliceIds and non-existent _path should not throw and skip the missing objects.', async () => {
    const json = [
      {
        meta: { vin: 'car1' },
        color: {
          ref: { id: 'RAL9000' },
          name: 'Black',
        },
        other: {
          ref: { id: 'RAL9000' },
          name: 'Black',
        },
      },
      {
        meta: { vin: 'car2' },
        color: {
          ref: { id: 'RAL7000' },
          name: 'Gray',
        },
        other: {
          ref: { id: 'RAL7000' },
          name: 'Gray',
        },
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'meta/vin',
      _name: 'Car',
      colorRefs: ['sliceId@Color', 'general@Color'],
      _types: [
        {
          _name: 'Color',
          _path: 'color/color',
          _sliceId: 'ref/id',
          general: ['name'],
        },
        {
          _name: 'Other',
          _path: 'other',
          _sliceId: 'ref/id',
          g2: ['name'],
        },
      ],
    };

    expect(() => fromJson(json, chart)).not.toThrow();

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    // No item has a resolvable 'color/color' path, so the nested Color type
    // ends up with no slices and every reference is left empty instead of
    // erroring.
    await expectGolden(
      'example/converter/list-with-types-and-refs-nested-slice-id-missing-path.json',
    ).toBe(rljson);
    expect(result).toStrictEqual({});
  });
});
