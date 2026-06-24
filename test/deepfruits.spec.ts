// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { describe, it } from 'vitest';

import { DecomposeChart, DecomposeChartComponentPropertyDef, fromJson } from '../src/converter';

import { expectGolden } from './setup/goldens';


const deepfruitsJson = [
  {
    food: { fruit: 'Apple', taste: 'intense' },
    color: 'green',
    size: 'large',
    edible: true,
    nutrients: ['iron', 'magnesium', 'folic acid'],
    uses: { cooking: true, fermentation: true },
    shapes: { singleShapes: { overall: 'round', stem: true } },
  },
  {
    food: { fruit: 'Pear', taste: 'mild' },
    color: 'green',
    size: 'medium',
    edible: true,
    nutrients: ['iron', 'potassium', 'flavonoids'],
    uses: { cooking: true, fermentation: false },
    shapes: { singleShapes: { overall: 'elliptical', stem: true } },
  },
];

const deepfruitsChart: DecomposeChart = {
  _sliceId: 'food/fruit',
  _name: 'Fruit',
  color: ['color'],
  taste: ['food/taste'],
  retailInfo: [
    {
      origin: 'size',
      destination: 'fruitsize',
    } as DecomposeChartComponentPropertyDef,
    'edible',
  ],
  nutrients: ['nutrients'],
  usesRefs: [
    'sliceId@Uses',
    'further@Uses',
    'sliceId@Shapes',
    'details@Shapes',
  ],
  _types: [
    {
      _name: 'Uses',
      _path: 'uses',
      _sliceId: 'cooking',
      further: ['fermentation'],
    },
    {
      _name: 'Shapes',
      _path: 'shapes/singleShapes',
      _sliceId: 'overall',
      details: ['stem'],
    },
  ],
};

describe('Deepfruits', () => {
  it('should convert deepfruits with two sub-types and cross-type refs', async () => {
    const rljson = fromJson(deepfruitsJson, deepfruitsChart);

    await expectGolden('example/converter/deepfruits-with-types.json').toBe(
      rljson,
    );
  });
});
