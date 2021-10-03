/*
 * Extra tests for game-ddave.
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
import { game_ddave as handler } from '../index.js';

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

	// This test updates a tileset stored in the main game .exe.
	it('should allow VGA tileset modification', async function() {
		const game = new handler(fs);
		const gameWarnings = await game.open();
		const items = await game.items();

		assert.equal(gameWarnings.length, 0,
			'Expected no warnings, got: ' + JSON.stringify(gameWarnings));

		// Try to find the VGA tileset.
		assert.ok(items.graphics,
			'items.graphics missing, got: ' + JSON.stringify(items));

		assert.ok(items.graphics.children, 'items.graphics.children missing, got: '
			+ JSON.stringify(items.graphics));

		assert.ok(
			items.graphics.children['vga-map'],
			'items.graphics.children["vga-map"] missing, got: '
				+ JSON.stringify(items.graphics)
		);

		// Load the VGA tileset.
		const item = items.graphics.children['vga-map'];
		const imgTileset = await item.fnOpen();
		assert.ok(imgTileset, 'Unable to open "vga-map" item');

		// Make sure it looks right.
		assert.equal(imgTileset.length, 1, 'Incorrect number of images in vga-map tileset');
		assert.equal(imgTileset[0].frames.length, 53, 'Incorrect number of frames in vga-map tileset');

		assert.equal(imgTileset[0].palette[0][0], 0, 'Incorrect red value for palette entry 0');
		assert.equal(imgTileset[0].palette[0][1], 0, 'Incorrect green value for palette entry 0');
		assert.equal(imgTileset[0].palette[0][2], 0, 'Incorrect blue value for palette entry 0');

		assert.equal(imgTileset[0].palette[10][0], 85, 'Incorrect red value for palette entry 10');
		assert.equal(imgTileset[0].palette[10][1], 255, 'Incorrect green value for palette entry 10');
		assert.equal(imgTileset[0].palette[10][2], 85, 'Incorrect blue value for palette entry 10');

		// Examine the first tile.
		const tile = imgTileset[0].frames[0];
		assert.equal(tile.width, 16, 'Incorrect tile width');
		assert.equal(tile.height, 16, 'Incorrect tile height');

		// Modify the image.
		tile.pixels[0] = 10;
		tile.pixels[15] = 10;

		item.fnSave(imgTileset);

		const { files, warnings } = await game.save();
		await testutil.checkFileHash(
			files,
			{
				'dave.exe': 'm0owJ/LTT5p1W9keSoaMUiSM4KQ=',
			},
			'Incorrect data produced after modification'
		);
		assert.equal(warnings.length, 0,
			'Unexpected warnings when saving: ' + JSON.stringify(warnings));
	});

	// This test updates a tileset stored in the separate file egadave.dav.
	it('should allow EGA tileset modification', async function() {
		const game = new handler(fs);
		await game.open();
		const items = await game.items();

		// Load the EGA tileset.
		const item = items.graphics.children['ega-map'];
		const imgTileset = await item.fnOpen();
		assert.ok(imgTileset, 'Unable to open "ega-map" item');

		// Make sure it looks right.
		assert.equal(imgTileset.length, 1, 'Incorrect number of images in ega-map tileset');
		assert.equal(imgTileset[0].frames.length, 53, 'Incorrect number of frames in ega-map tileset');

		assert.equal(imgTileset[0].palette[0][0], 0, 'Incorrect red value for palette entry 0');
		assert.equal(imgTileset[0].palette[0][1], 0, 'Incorrect green value for palette entry 0');
		assert.equal(imgTileset[0].palette[0][2], 0, 'Incorrect blue value for palette entry 0');

		assert.equal(imgTileset[0].palette[10][0], 85, 'Incorrect red value for palette entry 10');
		assert.equal(imgTileset[0].palette[10][1], 255, 'Incorrect green value for palette entry 10');
		assert.equal(imgTileset[0].palette[10][2], 85, 'Incorrect blue value for palette entry 10');

		// Examine the first tile.
		const tile = imgTileset[0].frames[0];
		assert.equal(tile.width, 16, 'Incorrect tile width');
		assert.equal(tile.height, 16, 'Incorrect tile height');

		// Modify the image.
		tile.pixels[0] = 10;
		tile.pixels[15] = 10;

		item.fnSave(imgTileset);

		const { files, warnings } = await game.save();
		await testutil.checkFileHash(
			files,
			{
				'egadave.dav': 'FdwSt9Md1kdAmLt5E79qi2ju6uE=',
			},
			'Incorrect data produced after modification'
		);
		assert.equal(warnings.length, 0,
			'Unexpected warnings when saving: ' + JSON.stringify(warnings));
	});

	// Re-enable this test once map-ddave generate() is implemented.
	it.skip('should allow map modification', async function() {
		const game = new handler(fs);
		await game.open();
		const items = await game.items();

		// Load the first level.
		const item = items.levels.children['level.1'];
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
				'dave.exe': 'TODO',
			},
			'Incorrect data produced after modification'
		);
		assert.equal(warnings.length, 0,
			'Unexpected warnings when saving: ' + JSON.stringify(warnings));
	});

}); // Tests with real game files
