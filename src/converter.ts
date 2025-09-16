// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { hip } from '@rljson/hash';
import { Json } from '@rljson/json';
import {
  Cake, CakesTable, ComponentRef, ComponentsTable, JsonWithId, Layer, LayerRef, LayersTable, Rljson,
  SliceIdsRef, SliceIdsTable
} from '@rljson/rljson';


// .............................................................................
export class Converter {
  /** Example instance for test purposes */
  static get example(): Converter {
    return new Converter();
  }
}

export type DecomposeSheet = {
  _sliceId: string;
  _name?: string;
  _path?: string;
  _types?: DecomposeSheet[];
} & { [key: string]: string[] | string | DecomposeSheet[] };

const resolvePropertySliceId = (
  ref: string,
  idx: number,
  nestedTypes: Rljson,
) => {
  const slideIds = nestedTypes[ref] as SliceIdsTable;
  const sliceId = slideIds._data[0].add[idx];
  return { [ref]: sliceId as SliceIdsRef };
};

const resolvePropertyReference = (
  ref: string,
  idx: number,
  nestedTypes: Rljson,
) => {
  const refCompRef = ref.slice(0, -3) as string;
  const refComp = nestedTypes[refCompRef] as ComponentsTable<any>;
  const refCompRow = refComp._data[idx] as JsonWithId;
  return { [ref]: (refCompRow as any)._hash as ComponentRef };
};

const nestedProperty = (
  obj: any,
  idx: number,
  path: string,
  nestedTypes: Rljson,
) => {
  const keys = path.split('/');

  if (keys.length === 1) {
    const key = keys[0];
    if (key.slice(-3) == 'Ref')
      return resolvePropertyReference(key, idx, nestedTypes);
    else if (key.slice(-7).toLowerCase() == 'sliceid')
      return resolvePropertySliceId(key, idx, nestedTypes);
    else return { [key]: obj ? (obj[key] ? obj[key] : null) : null };
  } else {
    return nestedProperty(
      obj[keys[0]],
      idx,
      keys.slice(1).join('/'),
      nestedTypes,
    );
  }
};

export const fromJson = (
  json: Array<Json>,
  decomposeSheet: DecomposeSheet,
): Rljson => {
  if (!Array.isArray(json)) return fromJson([json], decomposeSheet);

  const slideIdsName = decomposeSheet._name
    ? decomposeSheet._name.toLowerCase() + 'SliceId'
    : 'sliceId';
  const cakeName = decomposeSheet._name
    ? decomposeSheet._name.toLowerCase() + 'Cake'
    : 'cake';

  //Recursively decompose nested types
  const nestedTypes =
    decomposeSheet._types && Array.isArray(decomposeSheet._types)
      ? decomposeSheet._types
          .map((t) => t as DecomposeSheet)
          .map((t) =>
            fromJson(
              t._path
                ? json.flatMap((i) => (i as any)[t._path as string])
                : json,
              t,
            ),
          )
          .reduce((a, b) => ({ ...a, ...b }), {})
      : {};

  //This type
  const componentsName = (layerName: string, objName?: string) =>
    objName
      ? `${objName.toLowerCase()}${
          layerName.charAt(0).toUpperCase() + layerName.slice(1)
        }`
      : layerName.toLowerCase();

  const ids = json.map((item) => item[decomposeSheet._sliceId]);
  const sliceIds: SliceIdsTable = hip({
    _type: 'sliceIds',
    _data: [
      {
        add: ids as SliceIdsRef[],
      },
    ],
  });

  const components: Record<string, ComponentsTable<Json>> = Object.entries(
    decomposeSheet,
  )
    .filter(([layerKey]) => !layerKey.startsWith('_'))
    .map(([layerKey, componentProperties]) =>
      Object.assign({
        [componentsName(layerKey, decomposeSheet._name)]: hip(
          Object.assign({
            _data: json.map((item, idx) =>
              (componentProperties as string[])
                .map((componentProperty) =>
                  nestedProperty(
                    item,
                    idx,
                    componentProperty as string,
                    nestedTypes,
                  ),
                )
                .reduce((a, b) => ({ ...a, ...b }), {}),
            ),
          } as ComponentsTable<Json>),
        ),
      } as Record<string, ComponentsTable<Json>>),
    )
    .reduce((a, b) => ({ ...a, ...b }), {});

  const layers = Object.entries(components)
    .map(
      ([componentKey, component]) =>
        Object.assign({
          [componentKey + 'Layer']: hip({
            _data: [
              {
                add: component._data
                  .map((compItem, idx) =>
                    Object.assign({
                      [ids[idx] as string]: (compItem as any)._hash,
                    }),
                  )
                  .reduce((a, b) => ({ ...a, ...b }), {}),
                sliceIdsTable: slideIdsName,
                sliceIdsTableRow: sliceIds._data[0]._hash as string,
                componentsTable: componentKey,
              } as Layer,
            ],
          } as LayersTable),
        }) as Record<string, LayersTable>,
    )
    .reduce((a, b) => ({ ...a, ...b }), {});

  //Reference to explicit layer, not LayerTable Hash
  const cake: CakesTable = {
    _type: 'cakes',
    _data: [
      {
        sliceIdsTable: slideIdsName,
        sliceIdsRow: sliceIds._data[0]._hash as string,
        layers: Object.entries(layers)
          .map(([layerKey, layer]) =>
            Object.assign({
              [layerKey]: layer._data[0]._hash as string,
            }),
          )
          .reduce((a, b) => ({ ...a, ...b }), {}) as {
          [key: string]: LayerRef;
        },
      } as Cake,
    ],
  };

  return {
    [slideIdsName]: sliceIds,
    ...components,
    ...layers,
    [cakeName]: cake,
    ...nestedTypes,
  };
};

export const exampleFromJsonJson: Array<Json> = [
  {
    VIN: 'VIN1',
    brand: 'Volkswagen',
    type: 'Polo',
    doors: 5,
    engine: 'Diesel',
    gears: 6,
    transmission: 'Manual',
    colors: {
      sides: 'green',
      roof: 'white',
      highlights: 'chrome',
    },
    wheels: [
      {
        SN: 'BOB37382',
        brand: 'Borbet',
        dimension: '185/60 R16',
      },
    ],
  },
  {
    VIN: 'VIN2',
    brand: 'Volkswagen',
    type: 'Golf',
    doors: 3,
    engine: 'Petrol',
    gears: 7,
    transmission: 'Automatic',
    colors: {
      sides: 'blue',
      roof: 'black',
      highlights: 'chrome',
    },
    wheels: [
      {
        SN: 'BOB37383',
        brand: 'Borbet',
        dimension: '195/55 R16',
      },
    ],
  },
];
//TODO: id -> sliceId
export const exampleFromJsonDecomposeSheet: DecomposeSheet = {
  _sliceId: 'VIN',
  _name: 'Car',
  general: ['brand', 'type', 'doors'],
  technical: ['engine', 'transmission', 'gears'],
  color: ['colors/sides', 'colors/roof', 'colors/highlights'],
  wheel: ['wheelSliceId', 'wheelBrandRef', 'wheelDimensionRef'],
  _types: [
    {
      _path: 'wheels',
      _sliceId: 'SN',
      _name: 'Wheel',
      brand: ['brand'],
      dimension: ['dimension'],
    },
  ],
};
