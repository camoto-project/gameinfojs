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
import { arc_fixed_ddave_exe } from '@camoto/gamearchive';
import {
	imageFromTileset,
	tilesetFromImage,
	pal_vga_6bit,
	tls_ddave_vga,
} from '@camoto/gamegraphics';

import Game from '../interface/game.js';

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
			const identified = arc_fixed_ddave_exe.identify(content_exe.main);
			if (!identified.valid) {
				debug(`identify() failed for ${exeFilename}: ${identified.reason}`);
				warnings.push(`${exeFilename} could not be positively identified.  It `
					+ `may be an unsupported version, modified, or corrupted.  `
					+ `Proceeding, you may encounter corruption.  If this is an `
					+ `official, unmodified version of the game, please report it so we `
					+ `can add support for it.`);
			}
			this.exe = arc_fixed_ddave_exe.parse(content_exe);
			debug(`Read ${this.exe.files.length} files from ${exeFilename}`);
		} catch (e) {
			debug(e);
			throw new Error(`Unable to continue, error while reading ${exeFilename}: ${e.message}`);
		}

		this.tileset = {};

		const fileGfxVGA = this.exe.files.find(f => f.name.toUpperCase() === 'VGADAVE.DAV');
		if (fileGfxVGA) {
			this.tileset.vga = tls_ddave_vga.read({
				main: fileGfxVGA.getContent(),
			});
		}
		// Since we won't be opening the file again, we can override it now so that
		// upon save it will convert the tileset back to the underlying file format.
		fileGfxVGA.getContent = () => {
			const generated = tls_ddave_vga.write(this.tileset.vga);
			this.saveWarnings = this.saveWarnings.concat(generated.warnings);
			return generated.content.main;
		};

		const filePalVGA = this.exe.files.find(f => f.name.toUpperCase() === 'VGA.PAL');
		this.palVGA = pal_vga_6bit.read({
			main: filePalVGA.getContent(),
		});
		filePalVGA.getContent = () => {
			const generated = pal_vga_6bit.write(this.palVGA);
			this.saveWarnings = this.saveWarnings.concat(generated.warnings);
			return generated.content.main;
		};

		return warnings;
	}

	async items() {

		// Find a file in this episode's .vol or .stn archives.
		function getFile(archive, filename) {
			const fileUpper = filename.toUpperCase();
			let file = this.exe.find(f => f.name.toUpperCase() === fileUpper);
			if (!file) {
				throw new Error(`Unable to find "${filename}" inside dave.exe.`);
			}

			return file;
		}

		// Same for the levels.
		let levels = {};
		for (let i = 1; i < 11; i++) {
			const padLevel = i.toString().padStart(2, '0');
			const filename = `level${padLevel}.dav`;

			// Function to extract the raw file.
			const fnExtract = () => getFile(filename).getContent();

			// Function to overwrite the file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFile(filename);
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
		{
			gfx['tiles'] = {
				title: `Map tiles (VGA)`,
				type: Game.ItemTypes.Image,
				// Function to open the file and return an Array<Image>.
				fnOpen: () => {
					// Extract the map tiles from the tileset and turn it into an image.
					let imgTileset = imageFromTileset(this.tileset.vga.slice(0, 53), 4);
					imgTileset.palette = this.palVGA[0].palette;
					return [ imgTileset ];
				},
				fnSave: obj => {
					// Convert the Image instance back into individual tiles and store
					// them in the loaded tileset.
					const tiles = tilesetFromImage(obj[0], {x: 16, y: 16}, 53, 0);
					// Replace the first 53 tiles with the new list.
					this.tileset.vga.splice(0, 53, ...tiles);
					return {
						warnings: [],
					};
				},
			};
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
		// overridden those functions inside open(), so when arc_fixed_ddave_exe
		// goes to read the data for each file, everything will get converted then.

		// Reset the array that all those functions will append to.
		this.saveWarnings = [];

		// Write out the .EXE file.
		const outputExe = arc_fixed_ddave_exe.generate(this.exe);
		await this.filesystem.write('dave.exe', outputExe.main);

		return this.saveWarnings;
	}
}
