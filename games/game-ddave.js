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

		const filePalVGA = this.exe.files.find(f => f.name.toUpperCase() === 'VGA.PAL');
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

		const gfxSources = ['cga', 'ega', 'vga'];
		let gfx = {};
		for (const xga of gfxSources) {
			let itmTiles = {
				title: `Map tiles (${xga.toUpperCase()})`,
				type: Game.ItemTypes.Image,
			};
			if (!this.tileset[xga]) {
				// Tileset wasn't loaded, disable opening.
				itmTiles.disabled = true;
			} else {
				// Function to open the file and return an Array<Image>.
				itmTiles.fnOpen = () => {
					// Extract the map tiles from the tileset and turn it into an image.
					let imgTileset = imageFromTileset(this.tileset[xga].slice(0, 53), 4);
					if (xga === 'vga') {
						imgTileset.palette = this.palVGA[0].palette;
					}
					return [ imgTileset ];
				};
				itmTiles.fnSave = obj => {
					// Convert the Image instance back into individual tiles and store
					// them in the loaded tileset.
					const tiles = tilesetFromImage(obj[0], {x: 16, y: 16}, 53, 0);
					// Replace the first 53 tiles with the new list.
					this.tileset[xga].splice(0, 53, ...tiles);
					return {
						warnings: [],
					};
				};
			}
			gfx[`tiles-${xga}`] = itmTiles;
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
