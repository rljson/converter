// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { BaseValidator, removeDuplicates, Validate } from '@rljson/rljson';

import * as fs from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  DecomposeChart,
  exampleFromJsonDecomposeSheet,
  exampleFromJsonJson,
  fromJson,
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
    expect(result).toStrictEqual({});
  });

  it('converts a JSON file without error', async () => {
    // const json = JSON.parse(
    //   fs.readFileSync(
    //     path.join(__dirname, 'files', 'catalog-example.json'),
    //     'utf-8',
    //   ),
    // );
  });

  it(
    'converts a JSON file without error',
    async () => {
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
                    { origin: 'Masse/Hoehe', destination: 'h' },
                    { origin: 'Masse/Hoehe1', destination: 'h1' },
                    { origin: 'Masse/Hoehe2', destination: 'h2' },
                    { origin: 'Masse/Hoehe3', destination: 'h3' },
                  ],
                  basicShapeDepth: [
                    { origin: 'Masse/Tiefe', destination: 'd' },
                    { origin: 'Masse/Tiefe1', destination: 'd1' },
                    { origin: 'Masse/Tiefe2', destination: 'd2' },
                    { origin: 'Masse/Tiefe3', destination: 'd3' },
                  ],
                  basicShapeWidth: [
                    { origin: 'Masse/Breite', destination: 'w' },
                    { origin: 'Masse/Breite1', destination: 'w1' },
                    { origin: 'Masse/Breite2', destination: 'w2' },
                    { origin: 'Masse/Breite3', destination: 'w3' },
                  ],
                },
              },
            ],
          },
        ],
      } as DecomposeChart;

      const rljsonWithDuplicates = fromJson(json, decomposeSheet);
      const rljson = removeDuplicates(rljsonWithDuplicates);

      // const v = new Validate();
      // v.addValidator(new BaseValidator());
      // const result = await v.run(rljson);

      await writeFile(
        path.join(
          __dirname,
          'goldens',
          'example',
          'converter',
          'catalog-example.json',
        ),
        JSON.stringify(rljson, null, 2),
      );

      await writeFile(
        path.join(
          __dirname,
          'goldens',
          'example',
          'converter',
          'catalog-example-with-duplicates.json',
        ),
        JSON.stringify(rljsonWithDuplicates, null, 2),
      );
    },
    500 * 1000,
  );
});
