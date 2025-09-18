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

##### Component References

RLJSON provides the concept of hard-linked References, which means, that on any Components Object you can reference another Components Objects by suffixing the components Key by "Ref" and by providing its unique reference (Hash).

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
```

In this example, we provide two kinds of references. First within colorSliceId, we refer directly to the sliceId of the Sub-Type Color. By providing colorGeneralRef as another component property, we refer to general Component of the Sub-Type Color. The result will look like this:

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

## Example

[src/example.ts](src/example.ts)
