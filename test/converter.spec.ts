// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { BaseValidator, Validate } from '@rljson/rljson';

import * as fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  DecomposeSheet, exampleFromJsonDecomposeSheet, exampleFromJsonJson, fromJson
} from '../src/converter';

import { expectGolden } from './setup/goldens';


describe('From JSON', () => {
  it('provides a converter for JSON Format', async () => {
    const json = exampleFromJsonJson;
    const decomposeSheet = exampleFromJsonDecomposeSheet;

    const rljson = fromJson(json, decomposeSheet);

    const v = new Validate();
    v.addValidator(new BaseValidator());
    const result = await v.run(rljson);

    await expectGolden('example/converter/from-json.json').toBe(rljson);
    await expect(result).toStrictEqual({});
  });
  it('converts a JSON file without error', async () => {
    const json = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, 'files', 'catalog-example.json'),
        'utf-8',
      ),
    );

    const decomposeSheet = {
      _sliceId: 'WinNr',
      _name: 'Catalog',
      general: [
        'KatalogName',
        'KatalogStand',
        'KatalogDatum',
        'GruppeNr',
        'Sprache',
        'ExportDatum',
        'Sachbearbeiter',
      ],
      _types: [
        {
          _path: 'Serien',
          _sliceId: 'Serie',
          _name: 'Series',
          general: ['SerienName'],
          _types: [
            {
              _path: 'ArtikelListe',
              _sliceId: 'Type',
              _name: 'Article',
              text: ['ArtikelText'],
              basicShape: {
                basicShapeHeight: [
                  'Masse/Hoehe',
                  'Masse/Hoehe1',
                  'Masse/Hoehe2',
                  'Masse/Hoehe3',
                ],
                basicShapeDepth: [
                  'Masse/Tiefe',
                  'Masse/Tiefe1',
                  'Masse/Tiefe2',
                  'Masse/Tiefe3',
                ],
                basicShapeWidth: [
                  'Masse/Breite',
                  'Masse/Breite1',
                  'Masse/Breite2',
                  'Masse/Breite3',
                ],
              },
            },
          ],
        },
      ],
    } as DecomposeSheet;

    const rljson = fromJson(json, decomposeSheet);

    // const v = new Validate();
    // v.addValidator(new BaseValidator());
    // const result = await v.run(rljson);

    await expectGolden('example/converter/catalog-example-reduced.json').toBe(
      rljson,
    );
    //await expect(result).toStrictEqual({});
  });
});
