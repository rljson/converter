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
  ColumnCfg,
  ComponentRef,
  ComponentsTable,
  createCakeTableCfg,
  createLayerTableCfg,
  Layer,
  LayerRef,
  LayersTable,
  removeDuplicates,
  Rljson,
  SliceIdsRef,
  SliceIdsTable,
  TableCfg,
  TablesCfgTable,
} from '@rljson/rljson';

import { traverse } from 'object-traversal';

/* v8 ignore start */
export class Converter {
  static get example(): Converter {
    return new Converter();
  }
}
/* v8 ignore end */

export type DecomposeChart = {
  _sliceId: string;
  _name?: string;
  _path?: string;
  _types?: DecomposeChart[];
  _skipLayerCreation?: string[];
} & Json;

const resolvePropertySliceId = (
  obj: Json,
  refType: string,
  chart: DecomposeChart,
) => {
  const typesIndexed: { [key: string]: string | undefined } = {};
  for (const t of chart._types || []) {
    if (t._name)
      Object.assign(typesIndexed, {
        [t._name]: {
          path: t._path,
          sliceId: t._sliceId,
        },
      });
  }
  const type = typesIndexed[refType] as any;
  const typePath = type?.path;
  const typeSliceId = type?.sliceId;

  const sliceIds: Array<SliceIdsRef> = [];
  for (const i of (obj[typePath] as SliceIdsRef[]) || []) {
    sliceIds.push(i[typeSliceId] as SliceIdsRef);
  }

  //Mapping all child objects correctly
  return { [refType.toLowerCase() + 'SliceId']: sliceIds as SliceIdsRef[] };
};

const resolvePropertyReference = (
  ref: string,
  obj: Json,
  refType: string,
  nestedRljson: Rljson,
  chart: DecomposeChart,
) => {
  const compName = ref.split('@')[0].replace('Ref', '');
  const subChart = chart._types?.find((t) => t._name === refType);

  if (!subChart)
    throw new Error(`Could not find subChart for reference type ${refType}!`);

  if (!subChart[compName])
    throw new Error(
      `Could not find component ${compName} in subChart for reference type ${refType}!`,
    );

  //Items we want to create references to
  const refItems = obj[subChart._path as string] as Array<Json>;
  if (!refItems || !Array.isArray(refItems) || refItems.length === 0) {
    return { [ref]: [] };
  }

  //Hence there could be nested components, we need to synthesize a component
  // only consisting of the items we want to reference
  const refItemComp = createComponent(
    refItems,
    compName,
    refType,
    subChart[compName] as string[] | Json,
    subChart,
    nestedRljson,
  );

  //Now we collect the references itself out of the synthesized component
  const refs: Array<ComponentRef> = [];
  for (let idx = 0; idx < refItems.length; idx++) {
    refs.push(
      (refItemComp[componentsName(compName, refType)]._data[idx] as any)
        ._hash as ComponentRef,
    );
  }

  const refName = componentsName(compName, refType) + 'Ref';

  return { [refName]: refs as ComponentRef[] };
};

const synthesizeObjectFromPath = (
  p: string | { origin: string; destination: string },
) => {
  const path: string =
    typeof p === 'object' && 'destination' in p && 'origin' in p ? p.origin : p;
  const keys = path.split('/');
  const obj: any = {};
  let current = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) {
      current[key] = 'string';
    } else {
      current[key] = {};
      current = current[key];
    }
  }
  return obj;
};

const componentsName = (layerName: string, objName?: string) =>
  objName
    ? `${objName.toLowerCase()}${
        layerName.charAt(0).toUpperCase() + layerName.slice(1)
      }`
    : layerName.toLowerCase();

// Pass keys array instead of splitting every time
const nestedProperty = (
  obj: any,
  path:
    | string
    | string[]
    | { origin: string; destination: string }
    | { origin: string; destination: string }[],
  chart?: DecomposeChart,
  nestedRljson?: Rljson,
  destination?: string,
) => {
  if (typeof path === 'object' && 'destination' in path && 'origin' in path) {
    const pathParsed = path as { origin: string; destination: string };
    return nestedProperty(
      obj,
      pathParsed.origin,
      chart,
      nestedRljson,
      pathParsed.destination,
    );
  } else {
    const keys = Array.isArray(path)
      ? (path as string[])
      : (path.split('/') as string[]);
    const key = keys[0];
    if (keys.length === 1) {
      if (key.includes('@')) {
        if (!nestedRljson)
          throw new Error(
            'References to nested types are not possible without defining _types in the chart!',
          );
        if (!chart)
          throw new Error('Chart must be provided to resolve references!');

        const refComp = key.split('@')[0];
        const refType = key.split('@')[1];

        if (refComp === 'sliceId') {
          return resolvePropertySliceId(obj, refType, chart);
        } else {
          return resolvePropertyReference(
            key,
            obj,
            refType,
            nestedRljson,
            chart,
          );
        }
      }
      if (!obj || !obj[key]) return null;

      return { [destination ? destination : key]: obj[key] };
    } else {
      return nestedProperty(
        obj[key],
        keys.slice(1),
        chart,
        nestedRljson,
        destination,
      );
    }
  }
};

const createComponent = (
  data: Array<Json>,
  componentKey: string,
  typeName: string,
  componentProperties: string[] | Json,
  chart?: DecomposeChart,
  nestedRljson?: Rljson,
) => {
  if (Array.isArray(componentProperties)) {
    //Array of properties --> loop through properties and collect them as
    // key-value pairs in one object

    const compArr = new Array(data.length);
    for (let idx = 0; idx < data.length; idx++) {
      const item = data[idx];
      const obj: any = {};
      for (const componentProperty of componentProperties as string[]) {
        Object.assign(
          obj,
          nestedProperty(item, componentProperty, chart, nestedRljson),
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
    //Nested object --> loop through keys and create one component per key
    // Then merge them into one component with references to the nested ones
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
          chart,
          nestedRljson,
        ),
      );
    }
    const mergedArr = new Array(data.length);
    for (let idx = 0; idx < data.length; idx++) {
      const obj: any = {};
      for (const compKey of Object.keys(componentProperties)) {
        const compName = componentsName(compKey, typeName);
        const comp = nestedComps[compName];
        obj[compName + 'Ref'] = comp._data[idx]._hash as ComponentRef;
      }
      mergedArr[idx] = obj;
    }
    const mergedComp: Record<string, ComponentsTable<Json>> = {
      [componentsName(componentKey, typeName)]: hip({ _data: mergedArr }),
    } as any;
    return { ...nestedComps, ...mergedComp };
  }
};

const createComponentTableCfgs = (
  componentKey: string,
  typeName: string,
  componentProperties: string[] | Json,
  chart?: DecomposeChart,
  nestedRljson?: Rljson,
) => {
  if (Array.isArray(componentProperties)) {
    //Array of properties --> loop through properties and collect them as
    // key-value pairs in one object
    const columns: ColumnCfg[] = [{ key: '_hash', type: 'string' }];
    for (const componentProperty of componentProperties as string[]) {
      const skeleton = synthesizeObjectFromPath(componentProperty);
      const propSkeleton = nestedProperty(
        skeleton,
        componentProperty,
        chart,
        nestedRljson,
      );
      const column = Object.entries(propSkeleton!).map(
        ([key, value]) =>
          ({
            key,
            type: typeof value,
          } as ColumnCfg),
      );
      columns.push(...column);
    }
    const tableCfg: TableCfg = {
      key: componentsName(componentKey, typeName),
      type: 'components',
      columns,
      isHead: false,
      isRoot: false,
      isShared: false,
    };
    return [tableCfg];
  } else {
    //Nested object --> loop through keys and create one component per key
    // Then merge them into one component with references to the nested ones
    const nestedCompTableCfgs: TableCfg[] = [];
    for (const [nestedCompKey, nestedCompProps] of Object.entries(
      componentProperties as Json,
    )) {
      const tableCfg = createComponentTableCfgs(
        nestedCompKey,
        typeName,
        nestedCompProps as string[] | Json,
        chart,
        nestedRljson,
      );
      nestedCompTableCfgs.push(...tableCfg);
    }

    const consolidatingTableCfg: TableCfg[] = createComponentTableCfgs(
      componentKey,
      typeName,
      Object.keys(componentProperties)
        .map((k) => componentsName(k, typeName))
        .map((k) => `${k}Ref`),
      chart,
      nestedRljson,
    );

    return [...nestedCompTableCfgs, ...consolidatingTableCfg];
  }
};

export const fromJson = (
  json: Json | Array<Json>,
  chart: DecomposeChart,
): Rljson => {
  //If a single object is passed, convert to array
  if (!Array.isArray(json)) return fromJson([json], chart);

  //Property Guards
  //............................................................................

  //SubTypes given -> distinguish them by name
  if (!chart._name && Array.isArray(chart._types))
    throw new Error('If subtypes are defined, _name must be provided!');

  //Component names must be unique within one chart
  const componentNames: string[] = [];
  traverse(chart, ({ key }) =>
    isNaN(+key!) &&
    !['origin', 'destination'].includes(key!) &&
    !key?.startsWith('_')
      ? componentNames.push(key!)
      : null,
  );
  if (new Set(componentNames).size < componentNames.length)
    throw new Error(
      'All component names must be unique within one chart! Component names: ' +
        componentNames.join(', '),
    );

  //Type names must be unique within one chart
  const typeNames: string[] = [];
  traverse(chart, ({ key, value }) =>
    key === '_name' ? typeNames.push(value) : null,
  );
  if (new Set(typeNames).size < typeNames.length)
    throw new Error('All _name properties must be unique within one chart!');

  //SubTypes given --> they need pathes
  if (
    Array.isArray(chart._types) &&
    chart._types.map((t) => t._path).includes(undefined)
  )
    throw new Error('If subtypes are defined, _path must be provided!');

  //.............................................................................
  // Convert nested types first --> references to nested types possible
  const nestedRljson: Rljson = {};
  if (chart._types && Array.isArray(chart._types)) {
    for (const t of chart._types as DecomposeChart[]) {
      const nestedJson = json.flatMap((i) => (i as any)[t._path as string]);
      const result = fromJson(nestedJson, t);
      Object.assign(nestedRljson, result);
    }
  }

  //Extracting sliceIds
  const slideIdsName = chart._name
    ? chart._name.toLowerCase() + 'SliceId'
    : 'sliceId';

  const ids = json.map((item) => item[chart._sliceId]);
  const sliceIds: SliceIdsTable = hip({
    _type: 'sliceIds',
    _data: [
      {
        add: ids as SliceIdsRef[],
      },
    ],
  });

  //Translating skipped layers if name is given
  const skipLayersForComps = chart._skipLayerCreation
    ? chart._skipLayerCreation.map((l) => componentsName(l, chart._name))
    : [];

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
          chart,
          nestedRljson,
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

  // Create Cake
  const cakeName = chart._name ? chart._name.toLowerCase() + 'Cake' : 'cake';
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

  // TableCfgs
  const tableCfgs: TablesCfgTable = { _type: 'tableCfgs', _data: [] };
  for (const [layerKey, componentProperties] of Object.entries(chart)) {
    if (!layerKey.startsWith('_')) {
      const compName = componentsName(layerKey, chart._name);
      //Create TableCfg for component
      const compTableCfgs = createComponentTableCfgs(
        layerKey,
        chart._name as string,
        componentProperties as string[] | Json,
        chart,
        nestedRljson,
      );
      tableCfgs._data.push(...compTableCfgs);

      //Create TableCfg for layer
      const layerName = compName + 'Layer';
      const layerTableCfg: TableCfg = createLayerTableCfg(layerName);
      tableCfgs._data.push(layerTableCfg);
    }
  }

  const cakeTableCfg: TableCfg = createCakeTableCfg(cakeName);
  tableCfgs._data.push(cakeTableCfg);

  //Merge tableCfgs of nested rljson if existing
  tableCfgs._data = [
    ...(nestedRljson.tableCfgs?._data || []),
    ...tableCfgs._data,
  ];

  //Assemble final rljson
  const rljson: Rljson = {
    [slideIdsName]: sliceIds,
    ...components,
    ...layers,
    [cakeName]: cake,
    ...nestedRljson,
    tableCfgs,
  };

  //Remove duplicate entries on all levels
  removeDuplicates(rljson);

  return rljson;
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
