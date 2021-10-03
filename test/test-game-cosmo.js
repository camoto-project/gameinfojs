/*
 * Extra tests for game-cosmo.
 *
 * Copyright (C) 2010-2021 Adam Nielsen <malvineous@shikadi.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import assert from 'assert';
import TestUtil from './util.js';
import { game_cosmo as handler } from '../index.js';

const md = handler.metadata();
let testutil = new TestUtil(md.id);
describe(`Tests with real game files for ${md.title} [${md.id}]`, function() {
	const fs = testutil.getFilesystem();

	before('check test data', async function() {
		if (!fs) this.skip();

		// Make sure the files we expect are present, to avoid errors from
		// supplying the wrong files.
		await testutil.checkOriginalFiles();
	});

	it('should allow tileset modification', async function() {
		const game = new handler(fs);
		await game.open();
		const items = await game.items();

		// Load the tileset.
		const item = items.e1.children.tiles.children['tiles.solid'];
		const imgTileset = await item.fnOpen();
		assert.ok(imgTileset, 'Unable to open "tiles.solid" item');

		// Make sure it looks right.
		assert.equal(imgTileset.length, undefined, 'Incorrect number of images in tiles.solid tileset');
		assert.equal(imgTileset.frames.length, 2000, 'Incorrect number of frames in tiles.solid tileset');
		assert.equal(imgTileset.width, 8, 'Incorrect tile width');
		assert.equal(imgTileset.height, 8, 'Incorrect tile height');

		// Examine the first tile.
		const tile = imgTileset.frames[0];
		assert.equal(tile.width, undefined, 'Incorrect tile width');
		assert.equal(tile.height, undefined, 'Incorrect tile height');

		// Modify the image.
		tile.pixels[0] = 10;
		tile.pixels[15] = 10;

		item.fnSave(imgTileset);

		const { files, warnings } = await game.save();
		await testutil.checkFileHash(
			files,
			{
				'cosmo1.stn': 'DIoZWWMNKGA6ONIt1neBR6CFYxQ=',
			},
			'Incorrect data produced after modification'
		);
		assert.equal(warnings.length, 0,
			'Unexpected warnings when saving: ' + JSON.stringify(warnings));
	});

	// Re-enable this test once map-cosmo generate() is implemented.
	it.skip('should allow map modification', async function() {
		const game = new handler(fs);
		await game.open();
		const items = await game.items();

		// Load the first level.
		const item = items.e1.children.levels.children['level.1'];
		const level = await item.fnOpen();
		assert.ok(level, 'Unable to open "level.1" item');

		// Make sure it looks right.
		assert.equal(level.type, 'map2d', 'Wrong level type');
		assert.equal(level.layers.length, 2, 'Incorrect number of layers');

		const bg = level.layers[0];
		assert.equal(bg.tiles[0][0], 17, 'Incorrect tile code');
		assert.equal(bg.tiles[0][1], 17, 'Incorrect tile code');

		// Modify the image.
		bg.tiles[0] = 2;
		bg.tiles[5] = 3;

		item.fnSave(level);

		const { files, warnings } = await game.save();
		await testutil.checkFileHash(
			files,
			{
				'cosmo1.vol': 'TODO',
			},
			'Incorrect data produced after modification'
		);
		assert.equal(warnings.length, 0,
			'Unexpected warnings when saving: ' + JSON.stringify(warnings));
	});

}); // Tests with real game files
