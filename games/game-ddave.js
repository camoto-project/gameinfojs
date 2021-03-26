/*
 * Information about Dangerous Dave 1.
 *
 * This game is documented on the ModdingWiki:
 *   http://www.shikadi.net/moddingwiki/Dangerous_Dave
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

const FORMAT_ID = 'game-ddave';

import Debug from '../util/debug.js';
const debug = Debug.extend(FORMAT_ID);

import { decompressEXE } from '@camoto/gamecode';
import { arc_exe_ddave } from '@camoto/gamearchive';
import {
	imageFromTileset,
	tilesetFromImage,
	imageFromMask,
	maskFromImage,
	pal_vga_6bit,
	tls_ddave_cga,
	tls_ddave_ega,
	tls_ddave_vga,
} from '@camoto/gamegraphics';

import Game from '../interface/game.js';

const tilesetHandler = {
	cga: tls_ddave_cga,
	ega: tls_ddave_ega,
	vga: tls_ddave_vga,
};

export default class Game_DDave extends Game
{
	static metadata() {
		let md = {
			...super.metadata(),
			id: FORMAT_ID,
			title: 'Dangerous Dave',
		};

		return md;
	}

	static async identify(filesystem) {
		const exeFilename = 'dave.exe';
		const exe = await filesystem.findFile(exeFilename);
		if (exe) {
			return {
				valid: true,
				reason: `Found ${exeFilename}.`,
			};
		}

		return {
			valid: false,
			reason: `Unable to find ${exeFilename}.`,
		};
	}

	constructor(filesystem) {
		super(filesystem);
	}

	async open() {
		let warnings = [];

		const exeFilename = 'dave.exe';
		try {
			const content_exe = {
				main: decompressEXE(await this.filesystem.read(exeFilename)),
			};
			const identified = arc_exe_ddave.identify(content_exe.main);
			if (!identified.valid) {
				debug(`identify() failed for ${exeFilename}: ${identified.reason}`);
				warnings.push(`${exeFilename} could not be positively identified.  It `
					+ `may be an unsupported version, modified, or corrupted.  `
					+ `Proceeding, you may encounter corruption.  If this is an `
					+ `official, unmodified version of the game, please report it so we `
					+ `can add support for it.`);
			}
			this.exe = arc_exe_ddave.parse(content_exe);
			debug(`Read ${this.exe.files.length} files from ${exeFilename}`);
		} catch (e) {
			debug(e);
			throw new Error(`Unable to continue, error while reading ${exeFilename}: ${e.message}`);
		}

		this.tileset = {};

		for (const xga of Object.keys(tilesetHandler)) {
			const filename = `${xga}dave.dav`;
			if (xga === 'ega') {
				// egadave.dav gets read from the filesystem.
				let contentGfx;
				try {
					contentGfx = await this.filesystem.read(filename);
				} catch (e) {
					warnings.push(`Unable to find "${filename}", omitting EGA tiles.`);
					continue;
				}
				try {
					this.tileset[xga] = tilesetHandler[xga].read({
						main: contentGfx,
					});
				} catch (e) {
					warnings.push(`Unable to read EGA graphics: ${e.message}`);
				}
			} else {
				// cgadave.dav and vgadave.dav get read from inside the .exe.
				let fileGfx = this.exe.files.find(f => f.name.toLowerCase() === filename);
				if (fileGfx) {
					this.tileset[xga] = tilesetHandler[xga].read({
						main: fileGfx.getContent(),
					});

					// Since we won't be opening the file again, we can override it now so
					// that upon save it will convert the tileset back to the underlying
					// file format.  This saves us from having to search for the file
					// inside the .exe again during save while we already have it now.
					fileGfx.getContent = () => {
						const generated = tilesetHandler[xga].write(this.tileset[xga]);
						this.saveWarnings = this.saveWarnings.concat(generated.warnings);
						return generated.content.main;
					};
				} else {
					warnings.push(`Unable to find "${filename}" inside dave.exe, `
						+ `omitting ${xga.toUpperCase()} tiles.`);
				}
			}
		}

		const filePalVGA = this.exe.files.find(f => f.name.toLowerCase() === 'vga.pal');
		this.palVGA = pal_vga_6bit.read({
			main: filePalVGA.getContent(),
		});

		return warnings;
	}

	async items() {

		// Prepare the levels.
		let levels = {};
		for (let i = 1; i < 11; i++) {
			const padLevel = i.toString().padStart(2, '0');
			const filename = `level${padLevel}.dav`;
			let file = this.exe.files.find(f => f.name.toLowerCase() === filename);
			if (!file) {
				throw new Error(`Unable to find "${filename}" inside dave.exe.`);
			}

			// Function to extract the raw file.
			const fnExtract = () => file.getContent();

			// Function to overwrite the file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				file.getContent = () => content;
				file.diskSize = file.nativeSize = content.length;
			};

			levels[`level.${i}`] = {
				title: `Level ${i}`,
				subtitle: filename,
				type: Game.ItemTypes.Map,
				fnExtract,
				fnReplace,
				fnOpen: () => this.openMap(filename),
			};
		}

		let gfx = {};

		const palIndexTransparent = {
			cga: [3, 4],      // one more than full palette
			ega: [15, 16],    // one more than full palette
			vga: [255, 230],  // random colour that isn't used in the original game
		};

		const addTiles = (title, xga, offset, count, width, masked = false) => {
			let itmTiles = {
				title: title,
				type: Game.ItemTypes.Image,
			};
			if (!this.tileset[xga]) {
				// Tileset wasn't loaded, disable opening.
				itmTiles.disabled = true;
			} else if (count === 1) {
				itmTiles.fnOpen = () => {
					let imgTileset = this.tileset[xga][offset];
					if (xga === 'vga') {
						imgTileset.palette = this.palVGA[0].palette;
					} else {
						// Copy the default CGA/EGA palette.
						imgTileset.palette = this.tileset[xga][0].palette;
					}
					return [ imgTileset ];
				};
				itmTiles.fnSave = obj => {
					this.tileset[xga].splice(offset, offset + count, obj[0]);
					return {
						warnings: [],
					};
				};
			} else {
				// Function to open the file and return an Array<Image>.
				itmTiles.fnOpen = () => {
					let imgTileset;
					if (masked) {
						// These tiles are masked, so convert them into a single image with
						// a transparent palette entry used instead of the mask.
						const outputTiles = [];
						let numImages = width;
						const tiles = this.tileset[xga].slice(offset, offset + numImages);
						const masks = this.tileset[xga].slice(offset + numImages, offset + numImages * 2);
						const [ piMask, piTrans ] = palIndexTransparent[xga];
						for (let i = 0; i < numImages; i++) {
							outputTiles.push(
								imageFromMask({
									imgVisible: tiles[i],
									imgMask: masks[i],
									cb: (v, m) => (m === piMask) ? piTrans : v,
								})
							);
						}
						imgTileset = imageFromTileset(outputTiles, width);
					} else {
						// Extract the map tiles from the tileset and turn it into an image.
						imgTileset = imageFromTileset(this.tileset[xga].slice(offset, offset + count), width);
					}

					if (xga === 'vga') {
						imgTileset.palette = this.palVGA[0].palette;
					} else {
						// Copy the default CGA/EGA palette.
						imgTileset.palette = this.tileset[xga][0].palette;
					}

					// Create a transparent entry in the palette.
					if (masked) {
						if (xga === 'vga') {
							imgTileset.palette = imgTileset.palette.clone();
							imgTileset.palette[palIndexTransparent] = [0xFF, 0x00, 0xFF, 0x00];
						} else {
							// For CGA and EGA, add an extra palette entry for transparency.
							imgTileset.palette = imgTileset.palette.clone();
							imgTileset.palette.push([0xFF, 0x00, 0xFF, 0x00]);
						}
					}

					return [ imgTileset ];
				};
				itmTiles.fnSave = obj => {
					// Convert the Image instance back into individual tiles and store
					// them in the loaded tileset.
					let tiles;
					if (masked) {
						// Convert the transparent pixels back to a mask image.
						const origTiles = this.tileset[xga].slice(offset, offset + width);
						let inputTiles = tilesetFromImage(obj[0], origTiles, 0);
						let clearTiles = [];
						let masks = [];
						for (let i = 0; i < width; i++) {
							const { imgVisible, imgMask } = maskFromImage({
								img: inputTiles[i],
								cb: p => {
									const alpha = inputTiles[i].palette[p][3] === 0x00;
									return [
										// Pass the pixel through unchanged, unless it's transparent
										// in which case use palette entry 0 instead.
										alpha ? 0x00 : p,
										// Set the mask pixel to palette entry 255 if it should be
										// transparent, otherwise use 0.
										alpha ? 0xFF : 0x00,
									];
								},
							});
							clearTiles.push(imgVisible);
							masks.push(imgMask);
						}
						// Put all the visible tiles first, followed by all the masks.
						tiles = [ ...clearTiles, ...masks ];
					} else {
						const origTiles = this.tileset[xga].slice(offset, offset + count);
						tiles = tilesetFromImage(obj[0], origTiles, 0);
					}
					// Replace a section of tiles within the tileset with the new list.
					debug('before', this.tileset[xga].length, offset, count, tiles.length);
					this.tileset[xga].splice(offset, count, ...tiles);
					debug('after', this.tileset[xga].length);
					return {
						warnings: [],
					};
				};
			}
			return itmTiles;
		}
		// These ones are the same for all.
		const gfxSources = ['cga', 'ega', 'vga'];
		for (const xga of gfxSources) {
			gfx[`${xga}-tiles`] = addTiles(`Map tiles (${xga.toUpperCase()})`, xga, 0, 53, 9);
		}
		const vgaTiles = [
			['walk', 'Walking', 14, 7, true],
			['jump', 'Jumping', 4, 2, true],
			['climb', 'Climbing', 6, 3, true],
			['fly', 'Flying', 12, 6, true],
			['m1', 'Monster 1', 4, 4],
			['m2', 'Monster 2', 4, 4],
			['m3', 'Monster 3', 4, 4],
			['m4', 'Monster 4', 4, 4],
			['m5', 'Monster 5', 4, 4],
			['m6', 'Monster 6', 4, 4],
			['m7', 'Monster 7', 4, 4],
			['m8', 'Monster 8', 4, 4],
			['mb', 'Monster Bullet', 6, 6],
			['bullet', 'Bullet', 2, 2],
			['explode', 'Explosion', 4, 4],
			['inv-jetpack', 'Inventory - Jetpack', 1, 1],
			['inv-gun', 'Inventory - Gun', 1, 1],
			['stat-lives', 'Status - Lives', 1, 1],
			['stat-level', 'Status - Level', 1, 1],
			['stat-score', 'Status - Score', 1, 1],
			['inv-door', 'Inventory - Door', 1, 1],
			['msg-warp', 'Message - Warp', 1, 1],
			['msg-zone', 'Message - Zone', 1, 1],
			['inv-fuel', 'Inventory - Jetpack fuel', 1, 1],
			['inv-fuel-bar', 'Inventory - Jetpack fuel bar', 1, 1],
			['stat-life', 'Status - Life icon', 1, 1],
			['title', 'Title animation', 4, 1],
			['font-numbers', 'Font (numbers)', 10, 10],
		];
		let nextTileVGA = 53, nextTileCEGA = 53;
		for (const t of vgaTiles) {
			gfx[`vga-${t[0]}`] = addTiles(t[1], 'vga', nextTileVGA, t[2], t[3], t[4]);
			gfx[`ega-${t[0]}`] = addTiles(t[1], 'ega', nextTileCEGA, t[2]*4, t[3]*4, t[4]);
			gfx[`cga-${t[0]}`] = addTiles(t[1], 'cga', nextTileCEGA, t[2]*2, t[3]*2, t[4]);
			nextTileVGA += t[2];
			nextTileCEGA += t[2]*2;
		}

		return {
			'levels': {
				title: 'Levels',
				type: Game.ItemTypes.Folder,
				children: levels,
			},
			'graphics': {
				title: 'Graphics',
				type: Game.ItemTypes.Folder,
				children: gfx,
			},
			'sounds': {
				title: `Sound effects`,
				type: Game.ItemTypes.Sound,
				fnOpen: () => this.openSounds('sounds.spk'),
			},
		};
	}

	async preflight() {
		let warnings = [];

		return warnings;
	}

	async save() {
		// We don't need to convert this.tileset etc. because we've already
		// overridden those functions inside open(), so when arc_exe_ddave
		// goes to read the data for each file, everything will get converted then.

		// Reset the array that all those functions will append to.
		let warnings = [];

		if (this.tileset.ega) {
			const generated = tls_ddave_ega.write(this.tileset.ega);
			await this.filesystem.write('egadave.dav', generated.content.main);
			warnings = warnings.concat(generated.warnings);
		}

		// Update all the files inside the .exe archive.
		for (const xga of ['cga', 'vga']) {
			if (this.tileset[xga]) {
				const filename = `${xga}dave.dav`;
				let fileGfx = this.exe.files.find(f => f.name.toLowerCase() === filename);

				fileGfx.getContent = () => {
					const generated = tilesetHandler[xga].write(this.tileset[xga]);
					warnings = warnings.concat(generated.warnings);
					return generated.content.main;
				};
			}
		}

		const filePalVGA = this.exe.files.find(f => f.name.toLowerCase() === 'vga.pal');
		filePalVGA.getContent = () => {
			const generated = pal_vga_6bit.write(this.palVGA);
			warnings = warnings.concat(generated.warnings);
			return generated.content.main;
		};

		// Write out the .EXE file.
		const outputExe = arc_exe_ddave.generate(this.exe);
		await this.filesystem.write('dave.exe', outputExe.main);

		return warnings;
	}
}
