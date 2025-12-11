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
  createInsertHistoryTableCfg,
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

export type DecomposeChartComponentPropertyDef = {
  origin: string;
  destination: string;
};

const createHistoryTable = (tableKey: string): Rljson => ({
  [tableKey + 'InsertHistory']: {
    _type: 'insertHistory',
    _data: [],
  },
});

const sliceIdsName = (type: string) =>
  type ? type.toLowerCase() + 'SliceId' : 'sliceId';

const createSliceIdsTableCfg = (type: string): TableCfg => ({
  key: sliceIdsName(type),
  type: 'sliceIds',
  columns: [
    {
      key: '_hash',
      type: 'string',
      titleLong: 'Hash',
      titleShort: 'Hash',
    },
    {
      key: 'base',
      type: 'string',
      titleLong: 'Base Slice ID',
      titleShort: 'Base',
    },
    {
      key: 'add',
      type: 'jsonArray',
      titleLong: 'Slice IDs',
      titleShort: 'IDs',
    },
    {
      key: 'remove',
      type: 'jsonArray',
      titleLong: 'Removed Slice IDs',
      titleShort: 'Removed',
    },
  ],
  isHead: false,
  isRoot: false,
  isShared: false,
});

const resolvePropertySliceId = (
  obj: Json,
  refType: string,
  chart: DecomposeChart,
  destination?: string,
) => {
  const typesIndexed: { [key: string]: string | undefined } = {};
  for (const t of chart._types!) {
    /* v8 ignore next -- @preserve */
    if (t._name)
      Object.assign(typesIndexed, {
        [t._name]: {
          path: t._path,
          sliceId: t._sliceId,
        },
      });
  }
  /* v8 ignore next -- @preserve */
  const type = typesIndexed[refType] as any;
  const typePath = type?.path;
  const typeSliceId = type?.sliceId;

  const sliceIdName = destination ?? refType.toLowerCase() + 'SliceId';

  const sliceIds: Array<SliceIdsRef> = [];
  //No sliceIds of this type present
  if (obj[typePath] === undefined)
    return { [sliceIdName]: sliceIds as SliceIdsRef[] };

  //Support for both single and multiple references
  const refObjs = Array.isArray(obj[typePath])
    ? (obj[typePath] as Array<Json>)
    : ([obj[typePath]] as Array<Json>);

  for (const refObj of refObjs) {
    sliceIds.push(refObj[typeSliceId] as SliceIdsRef);
  }

  //Mapping all child objects correctly
  return { [sliceIdName]: sliceIds as SliceIdsRef[] };
};

const resolvePropertyReference = (
  ref: string,
  obj: Json,
  nestedRljson: Rljson,
  chart: DecomposeChart,
  refType?: string,
  destination?: string,
) => {
  const compName = ref.split('@')[0];
  const refName = destination ?? componentsName(compName, refType);

  const subChart = chart._types?.find((t) => t._name === refType);
  const destinationChart = subChart ?? chart;

  /* v8 ignore next -- @preserve */
  if (!destinationChart[compName])
    throw new Error(
      `Could not find component ${compName} in destination chart! Destination Chart: ${
        refType && refType.length ? refType : 'Main Chart'
      }`,
    );

  //Items we want to create references to
  const refItems = obj[destinationChart._path as string] as Array<Json>;
  if (!refItems || !Array.isArray(refItems) || refItems.length === 0) {
    return { [refName]: [] };
  }

  //Hence there could be nested components, we need to synthesize a component
  // only consisting of the items we want to reference
  const refItemComp = createComponent(
    refItems,
    compName,
    destinationChart[compName] as string[] | Json,
    refType,
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

  return { [refName]: refs as ComponentRef[] };
};

const synthesizeObjectFromPath = (
  p: string | DecomposeChartComponentPropertyDef,
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
    | DecomposeChartComponentPropertyDef
    | DecomposeChartComponentPropertyDef[],
  chart?: DecomposeChart,
  nestedRljson?: Rljson,
  destination?: string,
) => {
  if (typeof path === 'object' && 'destination' in path && 'origin' in path) {
    const pathParsed = path as DecomposeChartComponentPropertyDef;
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
        // Reference to another component
        /* v8 ignore next -- @preserve */
        if (!nestedRljson)
          throw new Error(
            'References to nested types are not possible without defining _types in the chart!',
          );

        // Chart must be provided to resolve references
        /* v8 ignore next -- @preserve */
        if (!chart)
          throw new Error('Chart must be provided to resolve references!');

        const refComp = key.split('@')[0];
        const refType = key.split('@')[1];

        if (refComp === 'sliceId') {
          return resolvePropertySliceId(obj, refType, chart, destination);
        } else {
          return resolvePropertyReference(
            key,
            obj,
            nestedRljson,
            chart,
            refType,
            destination,
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
  componentProperties: string[] | Json,
  typeName?: string,
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
    return {
      [name]: hip(
        { _data: compArr, _type: 'components' },
        { throwOnWrongHashes: false },
      ),
    } as Record<string, ComponentsTable<Json>>;
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
          nestedCompProps as string[] | Json,
          typeName,
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
        obj[compName] = comp._data[idx]._hash as ComponentRef;
      }
      mergedArr[idx] = obj;
    }
    const mergedComp: Record<string, ComponentsTable<Json>> = {
      [componentsName(componentKey, typeName)]: hip(
        {
          _data: mergedArr,
          _type: 'components',
        } as ComponentsTable<Json>,
        { throwOnWrongHashes: false },
      ),
    } as any;
    return { ...nestedComps, ...mergedComp };
  }
};

const createComponentTableCfgs = (
  componentKey: string,
  componentProperties: string[] | Json,
  typeName?: string,
  chart?: DecomposeChart,
  nestedRljson?: Rljson,
) => {
  if (Array.isArray(componentProperties)) {
    //Array of properties --> loop through properties and collect them as
    // key-value pairs in one object
    const columns: ColumnCfg[] = [
      { key: '_hash', type: 'string', titleLong: 'Hash', titleShort: 'Hash' },
    ];
    for (const componentProperty of componentProperties as string[]) {
      const skeleton = synthesizeObjectFromPath(componentProperty);
      const propSkeleton = nestedProperty(
        skeleton,
        componentProperty,
        chart,
        nestedRljson,
      );

      // Extract reference info if applicable
      let ref: { tableKey: string; columnKey?: string } | undefined;
      let originProperty;

      // Determine destination property name
      if (
        typeof componentProperty === 'object' &&
        'destination' in componentProperty
      ) {
        originProperty = (
          componentProperty as DecomposeChartComponentPropertyDef
        ).origin;
      } else {
        originProperty = componentProperty;
      }

      // Reference to another component
      if (originProperty.includes('@')) {
        const refType = originProperty.split('@')[1];
        const refTypeTable = originProperty.split('@')[0];
        const refTable = componentsName(refTypeTable, refType);

        ref = {
          tableKey: refTable,
        };
      }

      // Create column for each key in the propSkeleton
      const column = Object.entries(propSkeleton!).map(
        ([key, value]) =>
          ({
            key,
            type: !!ref ? 'string' : typeof value,
            titleLong: key.charAt(0).toUpperCase() + key.slice(1),
            titleShort: key,
            ref,
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
        nestedCompProps as string[] | Json,
        typeName,
        chart,
        nestedRljson,
      );
      nestedCompTableCfgs.push(...tableCfg);
    }

    const consolidatingTableCfg: TableCfg[] = createComponentTableCfgs(
      componentKey,
      Object.keys(componentProperties).map((p) =>
        typeName ? `${p}@${typeName}` : `${p}@`,
      ),
      typeName,
      chart![componentKey] as DecomposeChart,
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

  const ids = json.map((item) => item[chart._sliceId]);
  const sliceIds: SliceIdsTable = hip(
    {
      _type: 'sliceIds',
      _data: [
        {
          add: ids as SliceIdsRef[],
        },
      ],
    },
    { throwOnWrongHashes: false },
  );

  //Translating skipped layers if name is given
  const skipLayersForComps = chart._skipLayerCreation
    ? chart._skipLayerCreation.map((l) => componentsName(l, chart._name))
    : [];

  const components: Record<string, ComponentsTable<Json>> = {};
  for (const [layerKey, componentProperties] of Object.entries(chart)) {
    if (!layerKey.startsWith('_')) {
      //Create component
      Object.assign(
        components,
        createComponent(
          json,
          layerKey,
          componentProperties as string[],
          chart._name,
          chart,
          nestedRljson,
        ),
      );
    }
  }

  const histories: Rljson = {};
  const tableCfgs = [] as Array<TableCfg>;
  const layers: Record<string, LayersTable> = {};

  //Create Histories for Components
  for (const [componentKey] of Object.entries(components)) {
    Object.assign(histories, createHistoryTable(componentKey));
  }

  // Create Layers
  for (const [componentKey, component] of Object.entries(components)) {
    if (skipLayersForComps.includes(componentKey)) continue;

    const layerObj: any = {};
    for (let idx = 0; idx < component._data.length; idx++) {
      layerObj[ids[idx] as string] = (component._data[idx] as any)._hash;
    }
    const layerName = componentKey + 'Layer';
    layers[layerName] = hip(
      {
        _type: 'layers',
        _data: [
          {
            add: layerObj,
            sliceIdsTable: sliceIdsName(chart._name as string),
            sliceIdsTableRow: sliceIds._data[0]._hash as string,
            componentsTable: componentKey,
          } as Layer,
        ],
      },
      { throwOnWrongHashes: false },
    );

    //Create History for Layer
    Object.assign(histories, createHistoryTable(layerName));

    //Create TableCfg for layer
    const layerTableCfg: TableCfg = createLayerTableCfg(layerName);
    tableCfgs.push(layerTableCfg);
    tableCfgs.push(createInsertHistoryTableCfg(layerTableCfg));
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
        sliceIdsTable: sliceIdsName(chart._name as string),
        sliceIdsRow: sliceIds._data[0]._hash as string,
        layers: cakeLayers,
      } as Cake,
    ],
  };

  //Create History for Cake
  Object.assign(histories, createHistoryTable(cakeName));

  // TableCfgs
  for (const [layerKey, componentProperties] of Object.entries(chart)) {
    if (!layerKey.startsWith('_')) {
      const compName = componentsName(layerKey, chart._name);
      //Create TableCfg for component
      const compTableCfgs = createComponentTableCfgs(
        layerKey,
        componentProperties as string[] | Json,
        chart._name as string,
        chart,
        nestedRljson,
      );

      //Add component TableCfgs and their history TableCfgs
      for (const cfg of compTableCfgs) {
        tableCfgs.push(cfg);
        tableCfgs.push(createInsertHistoryTableCfg(cfg));
      }

      //Create TableCfg for layer
      const layerName = compName + 'Layer';
      const layerTableCfg: TableCfg = createLayerTableCfg(layerName);

      //Add layer TableCfg and its history TableCfg
      tableCfgs.push(layerTableCfg);
      tableCfgs.push(createInsertHistoryTableCfg(layerTableCfg));
    }
  }

  //Create TableCfg for cake
  const cakeTableCfg: TableCfg = createCakeTableCfg(cakeName);

  //Add cake TableCfg and its history TableCfg
  tableCfgs.push(cakeTableCfg);
  tableCfgs.push(createInsertHistoryTableCfg(cakeTableCfg));

  //Create TableCfg for sliceIds

  //Add sliceIds TableCfg and its history TableCfg
  const sliceIdsTableCfg: TableCfg = createSliceIdsTableCfg(
    chart._name as string,
  );
  tableCfgs.push(sliceIdsTableCfg);
  tableCfgs.push(createInsertHistoryTableCfg(sliceIdsTableCfg));

  //Create History for sliceIds
  Object.assign(
    histories,
    createHistoryTable(sliceIdsName(chart._name as string)),
  );

  //Merge tableCfgs of nested rljson if existing
  if (nestedRljson.tableCfgs) {
    tableCfgs.push(...nestedRljson.tableCfgs._data);
  }

  //Remove tableCfgs from nested rljson to avoid duplication
  delete nestedRljson.tableCfgs;

  //Assemble tableCfgs table
  const tableCfgsTable: TablesCfgTable = {
    _type: 'tableCfgs',
    _data: tableCfgs.map((cfg) => hip(cfg, { throwOnWrongHashes: false })),
  };

  //Assemble final rljson
  const rljson: Rljson = {
    [sliceIdsName(chart._name as string)]: sliceIds,
    ...components,
    ...layers,
    ...histories,
    [cakeName]: cake,
    ...nestedRljson,
    tableCfgs: tableCfgsTable,
  };

  //Assign tableCfgs to rljson tables
  for (const [key, value] of Object.entries(rljson)) {
    if (key === 'tableCfgs' || key.startsWith('_')) continue;

    const tableCfg = tableCfgs.find((cfg) => cfg.key === key);
    /* v8 ignore next -- @preserve */
    if (!tableCfg) throw new Error(`Could not find TableCfg for table ${key}!`);

    (value as any).tableCfg = tableCfg._hash;
  }

  //Remove duplicate entries on all levels
  return removeDuplicates(rljson);
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
