// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { hsh } from '@rljson/hash';
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
    ).toThrow('If subtypes are defined, _name must be provided!');
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
    ).toThrow('All _name properties must be unique within one chart!');
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
    ).toThrow(
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
    ).toThrow(
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
    ).toThrow('If subtypes are defined, _path must be provided!');
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
  it('List w/ types, references and an additional flat property should convert w/o errors.', async () => {
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
      {
        id: 'car3',
        color: {
          id: 'RAL9000',
          name: 'Black',
        },
        size: 'large',
      },
      {
        id: 'car4',
        color: {
          id: 'RAL7000',
          name: 'Gray',
        },
        size: 'medium',
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      _name: 'Car',
      colorRefs: ['sliceId@Color', 'general@Color'],
      size: ['size'],
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

    await expectGolden(
      'example/converter/list-with-types-and-refs-and-size.json',
    ).toBe(rljson);
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
        // 'meta/id' cannot be resolved for this item — it falls back to a
        // content hash of the item itself.
        model: 'Y',
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'meta/id',
      model: ['model'],
    };

    const rljson = fromJson(json, chart);
    const ids = (rljson.sliceId as any)._data[0].add as string[];

    expect(ids[0]).toBe('car1');
    expect(ids[1]).toBe(
      hsh({ ...(json[1] as any), __rowIndex: 1 } as any)._hash,
    );
  });

  it('Basic objects List with no _sliceId declared should derive a distinct id per item from a content-and-position hash.', () => {
    const json = [{ model: 'X' }, { model: 'Y' }, { model: 'X' }];

    const chart: DecomposeChart = {
      model: ['model'],
    };

    const rljson = fromJson(json, chart);
    const ids = (rljson.sliceId as any)._data[0].add as string[];

    expect(ids[0]).toBe((hsh({ model: 'X', __rowIndex: 0 }) as any)._hash);
    expect(ids[1]).toBe((hsh({ model: 'Y', __rowIndex: 1 }) as any)._hash);
    expect(ids[2]).toBe((hsh({ model: 'X', __rowIndex: 2 }) as any)._hash);
    // Item 0 and item 2 share identical content but its position in the
    // array is folded into the fallback hash, so they no longer collide into
    // the same sliceId.
    expect(ids[2]).not.toBe(ids[0]);
  });

  it('List w/ types and no natural key on the sub-type should derive sliceIds from a content-and-position hash.', async () => {
    const json = [
      {
        id: 'car1',
        wheels: [{ brand: 'Borbet' }, { brand: 'Michelin' }],
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      _name: 'Car',
      _types: [
        {
          _name: 'Wheel',
          _path: 'wheels',
          general: ['brand'],
        },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);
    expect(result).toStrictEqual({});

    const wheelIds = (rljson.wheelSliceId as any)._data[0].add as string[];
    expect(wheelIds).toEqual([
      (hsh({ brand: 'Borbet', __rowIndex: 0 }) as any)._hash,
      (hsh({ brand: 'Michelin', __rowIndex: 1 }) as any)._hash,
    ]);
  });

  it('List w/ types and duplicate-content sub-items with no natural key should still get distinct, addressable slices.', async () => {
    const json = [
      {
        id: 'car1',
        wheels: [{ brand: 'Borbet' }, { brand: 'Borbet' }],
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      _name: 'Car',
      _types: [
        {
          _name: 'Wheel',
          _path: 'wheels',
          general: ['brand'],
        },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);
    expect(result).toStrictEqual({});

    // Two physically distinct wheels with identical content and no natural
    // key cannot be told apart by content alone — but their position within
    // the array is folded into the fallback sliceId, so they still get two
    // distinct, addressable slices instead of collapsing into one.
    const wheelIds = (rljson.wheelSliceId as any)._data[0].add as string[];
    expect(new Set(wheelIds).size).toBe(2);

    const wheelGeneralLayer = (rljson.wheelGeneralLayer as any)._data[0]
      .add as Record<string, string>;
    expect(
      Object.keys(wheelGeneralLayer).filter((k) => k !== '_hash'),
    ).toHaveLength(2);

    // The underlying "brand: Borbet" content is still genuinely identical,
    // so — independently of sliceId identity — it still collapses to one
    // shared component row; both distinct wheel slices point at it.
    expect((rljson.wheelGeneral as any)._data).toHaveLength(1);
  });

  it('sliceId@Type reference embedding should use the content-hash fallback for a keyless sub-type.', async () => {
    const json = [
      {
        id: 'car1',
        screws: [
          { material: 'Stainless Steel', dimension: 'M4x20' },
          { material: 'Steel Zinc plated', dimension: 'M6x30' },
        ],
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      _name: 'Car',
      screwRefs: ['sliceId@Screw'],
      _types: [
        {
          _name: 'Screw',
          _path: 'screws',
          technical: ['material', 'dimension'],
        },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);
    expect(result).toStrictEqual({});

    const embeddedIds = (rljson.carScrewRefs as any)._data[0]
      .screwSliceId as string[];

    expect(embeddedIds).toEqual([
      (
        hsh({
          material: 'Stainless Steel',
          dimension: 'M4x20',
          __rowIndex: 0,
        }) as any
      )._hash,
      (
        hsh({
          material: 'Steel Zinc plated',
          dimension: 'M6x30',
          __rowIndex: 1,
        }) as any
      )._hash,
    ]);
  });

  it('sliceId@Type embedded inside a general@Type-synthesized sub-component should still resolve w/o errors.', async () => {
    // general@Type re-synthesizes the referenced type's own component
    // independently (see resolvePropertyReference), outside of the recursive
    // fromJson call that originally built that type's tables. When the
    // referenced component itself contains a sliceId@Type reference to a
    // further keyless sub-type, that re-synthesis has no way to know the
    // real base offset the original recursive call assigned — it falls back
    // to treating the item as if it were first (offset 0).
    const json = [
      {
        id: 'car1',
        colors: [{ id: 'RAL9000', pigments: [{ name: 'Titanium White' }] }],
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      _name: 'Car',
      colorRefs: ['general@Color'],
      _types: [
        {
          _name: 'Color',
          _path: 'colors',
          _sliceId: 'id',
          general: ['sliceId@Pigment'],
          _types: [
            {
              _name: 'Pigment',
              _path: 'pigments',
              info: ['name'],
            },
          ],
        },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);
    expect(result).toStrictEqual({});

    const embeddedRef = (rljson.carColorRefs as any)._data[0]
      .colorGeneral as string[];
    expect(embeddedRef).toHaveLength(1);

    // With a single color and a single pigment, the real base offset and the
    // offset-0 fallback happen to coincide, so the re-synthesized reference
    // still points at an actual row of the real colorGeneral table.
    const colorGeneralHashes = (rljson.colorGeneral as any)._data.map(
      (row: any) => row._hash,
    );
    expect(colorGeneralHashes).toContain(embeddedRef[0]);
  });

  it('Composite _sliceId (array of field paths) should combine resolved values into one deterministic sliceId.', () => {
    const json = [
      { make: 'Volkswagen', model: 'Polo', doors: 5 },
      { make: 'Volkswagen', model: 'Golf', doors: 3 },
    ];

    const chart: DecomposeChart = {
      _sliceId: ['make', 'model'],
      general: ['doors'],
    };

    const rljson = fromJson(json, chart);
    const ids = (rljson.sliceId as any)._data[0].add as string[];

    expect(ids[0]).toBe(
      (hsh({ make: 'Volkswagen', model: 'Polo' }) as any)._hash,
    );
    expect(ids[1]).toBe(
      (hsh({ make: 'Volkswagen', model: 'Golf' }) as any)._hash,
    );
    // Sharing a value in one field but not the other must not collapse the
    // two items into the same sliceId.
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('Composite _sliceId should fall back to a content hash when one of its fields does not resolve for an item.', () => {
    const json = [
      { make: 'Volkswagen', model: 'Polo' },
      // 'model' is missing here, so the composite key ['make', 'model']
      // cannot fully resolve for this item.
      { make: 'Volkswagen' },
    ];

    const chart: DecomposeChart = {
      _sliceId: ['make', 'model'],
      general: ['make'],
    };

    const rljson = fromJson(json, chart);
    const ids = (rljson.sliceId as any)._data[0].add as string[];

    expect(ids[0]).toBe(
      (hsh({ make: 'Volkswagen', model: 'Polo' }) as any)._hash,
    );
    expect(ids[1]).toBe(
      (hsh({ ...(json[1] as any), __rowIndex: 1 }) as any)._hash,
    );
  });

  it('Composite _sliceId should support nested paths for each of its fields.', () => {
    const json = {
      meta: { region: 'EU', id: 'car1' },
      model: 'X',
    };

    const chart: DecomposeChart = {
      _sliceId: ['meta/region', 'meta/id'],
      general: ['model'],
    };

    const rljson = fromJson(json, chart);
    const ids = (rljson.sliceId as any)._data[0].add as string[];

    expect(ids[0]).toBe(
      (hsh({ 'meta/region': 'EU', 'meta/id': 'car1' }) as any)._hash,
    );
  });

  it('Composite _sliceId on a sub-type should combine that sub-type\'s own field values.', async () => {
    const json = [
      {
        id: 'car1',
        wheels: [
          { axle: 'front', side: 'left', brand: 'Borbet' },
          { axle: 'front', side: 'right', brand: 'Borbet' },
        ],
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      _name: 'Car',
      _types: [
        {
          _name: 'Wheel',
          _path: 'wheels',
          _sliceId: ['axle', 'side'],
          general: ['brand'],
        },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);
    expect(result).toStrictEqual({});

    const wheelIds = (rljson.wheelSliceId as any)._data[0].add as string[];
    expect(wheelIds).toEqual([
      (hsh({ axle: 'front', side: 'left' }) as any)._hash,
      (hsh({ axle: 'front', side: 'right' }) as any)._hash,
    ]);
  });

  it('sliceId@Type reference embedding should use the composite-key hash when the sub-type declares a composite _sliceId.', async () => {
    const json = [
      {
        id: 'car1',
        screws: [
          { axle: 'front', side: 'left', material: 'Stainless Steel' },
          { axle: 'front', side: 'right', material: 'Steel Zinc plated' },
        ],
      },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      _name: 'Car',
      screwRefs: ['sliceId@Screw'],
      _types: [
        {
          _name: 'Screw',
          _path: 'screws',
          _sliceId: ['axle', 'side'],
          technical: ['material'],
        },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);
    expect(result).toStrictEqual({});

    const embeddedIds = (rljson.carScrewRefs as any)._data[0]
      .screwSliceId as string[];

    expect(embeddedIds).toEqual([
      (hsh({ axle: 'front', side: 'left' }) as any)._hash,
      (hsh({ axle: 'front', side: 'right' }) as any)._hash,
    ]);
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
    // has zero items and is omitted from the output entirely — no
    // colorSliceId/colorGeneral/colorCake/carColors tables are written.
    // Explicit reference columns (colorRefs) are unaffected and still
    // resolve to empty arrays instead of erroring.
    await expectGolden(
      'example/converter/list-with-types-and-refs-nested-slice-id-missing-path.json',
    ).toBe(rljson);
    expect(result).toStrictEqual({});

    expect(rljson.colorSliceId).toBeUndefined();
    expect(rljson.colorGeneral).toBeUndefined();
    expect(rljson.colorCake).toBeUndefined();
    expect(rljson.carColors).toBeUndefined();
    expect(rljson.carColorsLayer).toBeUndefined();
    expect(
      (rljson.carCake as any)._data[0].layers.carColorsLayer,
    ).toBeUndefined();

    // Other has a resolvable path for every item, so it is written normally.
    expect(rljson.otherSliceId).toBeDefined();
    expect((rljson.carCake as any)._data[0].layers.carOthersLayer).toBeDefined();
  });

  it('List w/ types where a type has zero items overall should be omitted entirely.', async () => {
    const json = [
      { id: 'car1', model: 'X' },
      { id: 'car2', model: 'Y' },
    ];

    const chart: DecomposeChart = {
      _sliceId: 'id',
      _name: 'Car',
      model: ['model'],
      _types: [
        {
          _name: 'Wheel',
          _path: 'wheels', // no car in this data set has a 'wheels' property
          _sliceId: 'SN',
          general: ['brand'],
        },
      ],
    };

    const rljson = fromJson(json, chart);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);
    expect(result).toStrictEqual({});

    for (const key of Object.keys(rljson)) {
      expect(key.toLowerCase().startsWith('wheel')).toBe(false);
      expect(key.toLowerCase().startsWith('carwheel')).toBe(false);
    }

    expect((rljson.carCake as any)._data[0].layers.carWheelsLayer).toBeUndefined();
  });
});
