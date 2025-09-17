// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { hip } from '@rljson/hash';
import { Json } from '@rljson/json';
import {
  Cake,
  CakesTable,
  ComponentRef,
  ComponentsTable,
  JsonWithId,
  Layer,
  LayerRef,
  LayersTable,
  Rljson,
  SliceIdsRef,
  SliceIdsTable,
} from '@rljson/rljson';

export class Converter {
  static get example(): Converter {
    return new Converter();
  }
}

export type DecomposeChart = {
  _sliceId: string;
  _name?: string;
  _path?: string;
  _types?: DecomposeChart[];
  _skipLayerCreation?: string[];
} & { [key: string]: string[] | string | DecomposeChart[] | Json };

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

// Pass keys array instead of splitting every time
const nestedProperty = (
  obj: any,
  idx: number,
  path:
    | string
    | string[]
    | { origin: string; destination: string }
    | { origin: string; destination: string }[],
  nestedTypes: Rljson,
  destination?: string,
) => {
  if (typeof path === 'object' && 'destination' in path && 'origin' in path) {
    const pathParsed = path as { origin: string; destination: string };
    return nestedProperty(
      obj,
      idx,
      pathParsed.origin,
      nestedTypes,
      pathParsed.destination,
    );
  } else {
    const keys = Array.isArray(path)
      ? (path as string[])
      : (path.split('/') as string[]);
    const key = keys[0];
    if (keys.length === 1) {
      if (!obj || !obj[key]) return null;
      if (key.slice(-3) == 'Ref')
        return resolvePropertyReference(key, idx, nestedTypes);
      else if (key.slice(-7).toLowerCase() == 'sliceid')
        return resolvePropertySliceId(key, idx, nestedTypes);
      else return { [destination ? destination : key]: obj[key] };
    } else {
      return nestedProperty(
        obj[key],
        idx,
        keys.slice(1),
        nestedTypes,
        destination,
      );
    }
  }
};

export const fromJson = (json: Array<Json>, chart: DecomposeChart): Rljson => {
  if (!Array.isArray(json)) return fromJson([json], chart);

  const slideIdsName = chart._name
    ? chart._name.toLowerCase() + 'SliceId'
    : 'sliceId';
  const cakeName = chart._name ? chart._name.toLowerCase() + 'Cake' : 'cake';

  // Recursively decompose nested types
  const nestedTypes: Rljson = {};
  if (chart._types && Array.isArray(chart._types)) {
    for (const t of chart._types as DecomposeChart[]) {
      const nestedJson = t._path
        ? json.flatMap((i) => (i as any)[t._path as string])
        : json;
      const result = fromJson(nestedJson, t);
      Object.assign(nestedTypes, result);
    }
  }

  const componentsName = (layerName: string, objName?: string) =>
    objName
      ? `${objName.toLowerCase()}${
          layerName.charAt(0).toUpperCase() + layerName.slice(1)
        }`
      : layerName.toLowerCase();

  const ids = json.map((item) => item[chart._sliceId]);
  const sliceIds: SliceIdsTable = hip({
    _type: 'sliceIds',
    _data: [
      {
        add: ids as SliceIdsRef[],
      },
    ],
  });

  const skipLayersForComps = chart._skipLayerCreation
    ? chart._skipLayerCreation.map((l) => componentsName(l, chart._name))
    : [];

  // Use for-loops for performance
  const createComponent = (
    data: Array<Json>,
    componentKey: string,
    typeName: string,
    componentProperties: string[] | Json,
  ) => {
    if (Array.isArray(componentProperties)) {
      const compArr = new Array(data.length);
      for (let idx = 0; idx < data.length; idx++) {
        const item = data[idx];
        const obj: any = {};
        for (const componentProperty of componentProperties as string[]) {
          Object.assign(
            obj,
            nestedProperty(item, idx, componentProperty, nestedTypes),
          );
        }
        compArr[idx] = obj;
      }
      const name = componentsName(componentKey, typeName);
      return { [name]: hip({ _data: compArr }) } as Record<
        string,
        ComponentsTable<Json>
      >;
    } else {
      const nestedComps: Record<string, ComponentsTable<Json>> = {};
      for (const [nestedCompKey, nestedCompProps] of Object.entries(
        componentProperties as Json,
      )) {
        Object.assign(
          nestedComps,
          createComponent(
            data,
            nestedCompKey,
            typeName,
            nestedCompProps as string[] | Json,
          ),
        );
      }
      const mergedArr = new Array(data.length);
      for (let idx = 0; idx < data.length; idx++) {
        const obj: any = {};
        for (const compKey of Object.keys(componentProperties)) {
          const compName = componentsName(compKey, typeName);
          const comp = nestedComps[compName];
          obj[compKey + 'Ref'] = comp._data[idx]._hash as ComponentRef;
        }
        mergedArr[idx] = obj;
      }
      const mergedComp: Record<string, ComponentsTable<Json>> = {
        [componentsName(componentKey, typeName)]: hip({ _data: mergedArr }),
      } as any;
      return { ...nestedComps, ...mergedComp };
    }
  };

  // Use for-loops for components
  const components: Record<string, ComponentsTable<Json>> = {};
  for (const [layerKey, componentProperties] of Object.entries(chart)) {
    if (!layerKey.startsWith('_')) {
      Object.assign(
        components,
        createComponent(
          json,
          layerKey,
          chart._name as string,
          componentProperties as string[],
        ),
      );
    }
  }

  // Use for-loops for layers
  const layers: Record<string, LayersTable> = {};
  for (const [componentKey, component] of Object.entries(components)) {
    if (skipLayersForComps.includes(componentKey)) continue;

    const layerObj: any = {};
    for (let idx = 0; idx < component._data.length; idx++) {
      layerObj[ids[idx] as string] = (component._data[idx] as any)._hash;
    }
    const layerName = componentKey + 'Layer';
    layers[layerName] = hip({
      _type: 'layers',
      _data: [
        {
          add: layerObj,
          sliceIdsTable: slideIdsName,
          sliceIdsTableRow: sliceIds._data[0]._hash as string,
          componentsTable: componentKey,
        } as Layer,
      ],
    });
  }

  // Use for-loops for cake layers
  const cakeLayers: { [key: string]: LayerRef } = {};
  for (const [layerKey, layer] of Object.entries(layers)) {
    cakeLayers[layerKey] = layer._data[0]._hash as string;
  }
  const cake: CakesTable = {
    _type: 'cakes',
    _data: [
      {
        sliceIdsTable: slideIdsName,
        sliceIdsRow: sliceIds._data[0]._hash as string,
        layers: cakeLayers,
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

export const exampleFromJsonDecomposeSheet: DecomposeChart = {
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
