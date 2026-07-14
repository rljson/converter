<!--
@license
Copyright (c) 2025 Rljson

Use of this source code is governed by terms that can be
found in the LICENSE file in the root of this package.
-->

# @rljson/converter

Converter provides basic functionality in converting textual, structured Data into rljson instances. Most common use case is converting JSON to RLJSON and back.

## fromJSON

Besides the data itself, it is necessary to provide any kind of a receipt transforming the tree-like structured data into the layer based data model of RLJSON.

To do so, we introduced the Decompose Chart.

### Decompose Chart

The Process of decomposition includes the following tasks:

* Define basic types of real world objects coexisting in your Data
* Define paths within your data tree, where relevant data is to be fined
* Define names for your types as well as unique sliceIds (IDs)
* Clustering similar or related data into corresponding Component Layers

The most simple Decompose Chart definition is maybe the following:

```ts
const json = {
  id: 'car1',
  model: 'X',
  manufacturer: 'Tesla',
}
const chart: DecomposeChart = {
  _sliceId: 'id',
  model: ['model'],
};

const rljson = fromJson(json, chart);
```

The result will be the following RLJSON environment:

```ts
  {
    "sliceId": {...}, //Simple Set of sliceIds
    "model": {...}, //Components for property "model", e.g. {model: 'X'}
    "modelLayer": {...}, //Maps sliceIds to their corresponding model components reference
    "cake": {...}, //Set of any layer existing in this environment
  }
```

#### Nested SliceId Paths

By default `_sliceId` reads a top-level property of each object. It may also be
a **nested path** using `/` as a separator, exactly like component property
paths. This lets you use an identifier that lives deeper in the object tree.

```ts
const json = {
  meta: { id: 'car1' },
  model: 'X',
};

const chart: DecomposeChart = {
  _sliceId: 'meta/id', // resolves to 'car1'
  model: ['model'],
};
```

Nested `_sliceId` paths work for the main chart as well as for sub-types in
`_types` (e.g. `_sliceId: 'ref/id'`). A flat key (no `/`) behaves exactly as
before, so this is fully backwards compatible — a nested `_sliceId` produces the
identical RLJSON to a flat one pointing at the same resolved value.

#### Composite SliceId

If no single field is unique on its own, `_sliceId` may be an **array of
paths** instead of a single path. Each path is resolved independently
(nested `/` paths are supported per entry), and the resolved values are
combined into one deterministic sliceId:

```ts
const json = [
  { make: 'Volkswagen', model: 'Polo', doors: 5 },
  { make: 'Volkswagen', model: 'Golf', doors: 3 },
];

const chart: DecomposeChart = {
  _sliceId: ['make', 'model'], // 'make' alone is not unique here
  general: ['doors'],
};
```

Values are combined by hashing the resolved `{path: value}` record rather
than joining them into a string. This avoids collisions between items whose
field values themselves contain a separator character (e.g. `make: 'A/B'`
+ `model: 'C'` colliding with `make: 'A'` + `model: 'B/C'` under a naive
join). Composite `_sliceId` works anywhere a single `_sliceId` does — the
main chart, sub-types declared via `_types`, and `sliceId@Type` reference
embedding.

If any one of the declared fields doesn't resolve for a given item, the
whole composite key is treated as unresolved for that item and the
[SliceId Fallback](#sliceid-fallback) content-hash applies, exactly like an
unresolved single-path `_sliceId`.

#### SliceId Fallback

Real-world data doesn't always have a natural, already-unique field to use as
`_sliceId` — this is especially common for sub-objects declared via `_types`
(e.g. array elements from a third-party export). If `_sliceId` is omitted
entirely, or the declared path doesn't resolve for a given item, that item's
own content hash is used as its sliceId instead:

```ts
const json = {
  id: 'car1',
  wheels: [{ brand: 'Borbet' }, { brand: 'Michelin' }],
};

const chart: DecomposeChart = {
  _sliceId: 'id',
  _name: 'Car',
  _types: [
    {
      _name: 'Wheel',
      _path: 'wheels',
      // no natural key on wheel objects — falls back to a content hash
      general: ['brand'],
    },
  ],
};
```

Each wheel still becomes its own individually addressable row, without
requiring a natural key in the source data.

The fallback folds each item's position within its array into the content
hash, so two sibling sub-objects with byte-identical content and no natural
key still get *distinct* fallback sliceIds (e.g. two structurally-identical
wheels under one car are recorded as two separate wheel references, not one).
This is independent of component-level deduplication: the underlying
`brand: 'Borbet'` data still collapses to a single shared component row (as
identical content does everywhere else in the converter) — only the sliceId
identity, and therefore the ability to address/count each occurrence
individually, is kept distinct.

#### Component Definition

Components devide real world objects horizontally into logical cluster of related data. Hence organizing the input data into components is key in the JSON Conversion task.

In this example you will see some ways of defining components within the Decompose Chart.

```ts
const json = {
  id: 'car1',
  model: 'X',
  manufacturer: 'Tesla',
  registration: {
    country: 'D',
    licensePlate: 'B-TX-100'
  },
  dimension: {
    length: 5036,
    width: 1999,
    heigh: 1684
  }
}
const chart: DecomposeChart = {
  _sliceId: 'id',
  info: ['model','manufacturer'],
  registration: ['registration/country','registration/licensePlate'],
  dimension: {
    length: ['dimension/length'],
    width: ['dimension/width'],
    height: ['dimension/height']
  }
  brand: [{origin: 'manufacturer',destination: 'brand'}]
};

const rljson = fromJson(json, chart);
```

The simplest component definition is `info`. It converts to the the following
RLJSON structure.

```ts
{
  info, //components of info e. g. {model: "X", manufacturer: "Tesla"}
  infoLayer // layer connecting info to sliceIds car1 -> hash({model: "X", manufacturer: "Tesla"})
}
```

##### Nested Objects

Definition of `registration` does the same as `info`, but takes its properties from containing data object `registration`.

```ts
{
  registration, //components of registration e. g. { country: "D", licensePlate: "B-TX-100"}
  registrationLayer // layer connecting info to sliceIds car1 -> hash({country: "D", licensePlate: "B-TX-100"})
}
```

##### Component Encapsulation

Definition of `dimension` is somehow different. Instead of just clustering properties to objects. It creates Components and Layers for `length`, `width` and `height`, extracts the references the corresponding component objects and builds a new encapsulating Layer on top of it, holding the references.

```ts
{
  length, //components of length e. g. {length: 5036,_hash: "poMsKI0UqeEM6h8qKVF3IU"}
  width, //components of width e. g. {width: 1999,_hash: "8EZxlYaF4z0HUMAW6bXsN6"}
  height, //components of height e. g. {height: 1684, _hash: "QtTfCbiTktna-iwRI0RsAa"}
  dimension, //components of dimension e. g. {lengthRef: "poMsKI0UqeEM6h8qKVF3IU", widthRef: "8EZxlYaF4z0HUMAW6bXsN6", heightRef: "QtTfCbiTktna-iwRI0RsAa"}
  lengthLayer,
  widthLayer,
  heightLayer,
  dimensionLayer
}
```

By default, the Converter will always generate Layers for nested components. Hence it is not necessary, it is possible to skip Layer creation for specific layers by providing the layers to be skipped via `_skipLayerCreation` parameter within Decompose Chart type definition.

##### Component Aliases

It is also possible to alias component properties. The definition of the Component `brand` consists of the property `manufacturer` within the input data objects. By defining `brand` as a destination, the converter aliases the property key to `brand` in the final components definition.

##### Array Values (As-Is)

When a component property points **directly** at an array in your source data,
the array is taken over **verbatim** into the component. It is *not* decomposed
into its own Type, Components and Layers — it is embedded as a single value, and
its generated `TableCfg` column is typed `jsonArray`.

Use this whenever you want to keep a list of values together as one opaque field
(tags, labels, raw coordinates, a small embedded record list) and you do **not**
need to normalize, deduplicate or reference its elements individually.

###### Arrays of primitives

```ts
const json = {
  id: 'car1',
  tags: ['fast', 'red', 'electric'],
};

const chart: DecomposeChart = {
  _sliceId: 'id',
  tags: ['tags'],
};

const rljson = fromJson(json, chart);
```

The resulting `tags` component holds the array unchanged, and its column is
typed `jsonArray`:

```ts
{
  tags: {
    _data: [{ tags: ['fast', 'red', 'electric'], _hash: '…' }],
    _type: 'components',
  },
  // tableCfgs → tags column: { key: 'tags', type: 'jsonArray', … }
}
```

###### Arrays of objects

The same applies to arrays of objects. They are embedded as-is (each nested
object is hashed in place by the Converter, but **no** separate `wheel`
component/layer/sliceId table is created):

```ts
const json = {
  id: 'car1',
  wheels: [
    { SN: 'BOB37382', brand: 'Borbet' },
    { SN: 'BOB37383', brand: 'Michelin' },
  ],
};

const chart: DecomposeChart = {
  _sliceId: 'id',
  wheels: ['wheels'],
};
```

→ a single `wheels` component whose value is the array, with a `jsonArray`
column.

###### As-Is vs. Decomposition

| Goal | Use |
|---|---|
| Keep the list together as one opaque field | **Array value (as-is)** — point a component property at the array key |
| Normalize / deduplicate / reference elements individually, build a sub-cake and relations | **Sub-Types** — declare the array under `_types` with a `_path` (see *Component References* below) |

###### Limitation — no traversal *into* arrays

As-is handling resolves the array **at** the addressed path. A nested path that
tries to reach *into* the array's elements (for example `wheels/brand`, hoping
to collect every `brand`) is **not** supported on the normal path — there is no
element-mapping or index syntax. If you need per-element fields, model the array
as a Sub-Type via `_types` / `_path` instead.

##### Component References

RLJSON provides the concept of hard-linked References, which means, that on any Components Object you can reference another Components Objects by suffixing the components Key by "Ref" and by providing its unique reference (Hash). Otherwise its possible to reference a sliceId of another Type by just suffixing the types Key by "SliceId".

```ts
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
  colorRefs: ['sliceId@Color', 'generalRef@Color'],
  _types: [
    {
      _name: 'Color',
      _path: 'color',
      _sliceId: 'id',
      general: ['name'],
    },
  ],
};
```

In this example, we provide two kinds of references. First within `sliceId@Color`, we refer directly to the sliceId of the Sub-Type Color. By providing `generalRef@Color` as another component property, we refer to general Component of the Sub-Type Color. The result will look like this:


```ts
  carColorRefs: {
    _data: [
      {
        colorSliceId: "RAL9000", //SliceId of Color directly inserted
        colorGeneralRef: "cIMFhZaDtJAkCF_h3PCCT1", //Corresponding reference (Hash) of colorGeneral Component
      },
      {
        colorSliceId: "RAL7000",
        colorGeneralRef: "nxgBIGoNSFZO083VAufXk9",
      }
    ]
  }
```

##### Empty Sub-Types Are Omitted

If a `_types` entry ends up with zero items across every parent item (its
`_path` never resolves to anything anywhere in the data), that type is
omitted from the output entirely — no `sliceIds`/component/layer/cake
tables are written for it, and the parent's automatic relation table for
it (and the corresponding layer in the parent's cake) is skipped too. This
always applies to `_types`; it is not configurable.

Explicit reference columns (`sliceId@Type` / `compKey@Type`) are
unaffected by this — they still resolve to empty arrays for a type with no
data, exactly as before.

## Example

[src/example.ts](src/example.ts)
