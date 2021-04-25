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
	frameFromTileset,
	tilesetFromFrame,
	frameFromMask,
	maskFromFrame,
	pal_vga_6bit,
	tls_ddave_cga,
	tls_ddave_ega,
	tls_ddave_vga,
} from '@camoto/gamegraphics';

import Game from '../interface/game.js';
import tilesetSplit from './game-ddave-tileset-split.js';

const tilesetHandler = {
	cga: tls_ddave_cga,
	ega: tls_ddave_ega,
	vga: tls_ddave_vga,
};

// Random colour that isn't used in the original game we can use as transparent.
const PALETTE_TRANSPARENT = 230;

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

		// Override one colour as transparent
		this.palVGA.palette[PALETTE_TRANSPARENT] = [255, 0, 255, 0];

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
			vga: [255, PALETTE_TRANSPARENT], // random colour that isn't used in the original game
		};

		// These ones are the same for all.
		const gfxSources = ['cga', 'ega', 'vga'];

		// Map codes in game-ddave-tileset-split.js into user-visible titles.
		const friendlyNames = {
			map: 'Map tiles',
			player: 'Player sprites',
			monsters: 'Monster sprites',
			ui: 'Interface',
			title: 'Title screen',
			font: 'Status bar font',
		};

		//const gfxSources = ['cga', 'ega', 'vga'];
		for (const xga of gfxSources) {
			if (!this.tileset[xga]) continue; // might be missing egadave.dav
			const XGA = xga.toUpperCase();

			// Precalculate the palette to use for masked images.
			let palTrans;
			if (xga === 'vga') {
				// For VGA, pick an unused colour and make it transparent.
				palTrans = this.palVGA.palette.clone();
				const c = palIndexTransparent[xga][1];
				palTrans[c] = [0xFF, 0x00, 0xFF, 0x00];
			} else {
				// For CGA and EGA, add an extra palette entry for transparency.
				palTrans = this.tileset[xga].palette.clone();
				palTrans.push([0xFF, 0x00, 0xFF, 0x00]);
			}

			const srcFrames = this.tileset[xga].frames;
			const [ piMask, piTrans ] = palIndexTransparent[xga];
			for (const [ spriteId, spriteIndex ] of Object.entries(tilesetSplit[xga])) {
				gfx[`${xga}-${spriteId}`] = {
					title: `${XGA} - ${friendlyNames[spriteId]}`,
					type: Game.ItemTypes.Image,

					fnOpen: () => {
						let sprites = [];
						for (const [ idxColours, idxMasks, idxOrder, tDelay ] of spriteIndex) {
							let sprite = this.tileset[xga].clone(0, 0);
							sprite.palette = palTrans;

							for (let i = 0; i < idxColours.length; i++) {
								if (idxMasks[i]) {
									// Unmask tile
									sprite.frames.push(
										frameFromMask({
											frVisible: srcFrames[idxColours[i]],
											frMask: srcFrames[idxMasks[i]],
											cb: (v, m) => (m === piMask) ? piTrans : v,
										})
									);
								} else {
									// Tile is not masked
									sprite.frames.push(srcFrames[idxColours[i]]);
								}
							}

							if (idxOrder.length) {
								sprite.animation = idxOrder.map(index => ({
									index,
									postDelay: tDelay,
								}));
							}

							// Special case to indicate the font tileset works best with a
							// particular width.
							if (spriteId === 'font') {
								sprite.fixedWidth = 10;
							}

							sprites.push(sprite);
						}
						return sprites;
					},

					fnSave: newImg => {
						let idxNextIncomingImage = 0;
						for (const [ idxColours, idxMasks, idxOrder, tDelay ] of spriteIndex) {
							const imgIncoming = newImg[idxNextIncomingImage];
							let idxNextIncomingFrame = 0;
							for (let i = 0; i < idxColours.length; i++) {
								const frameIncoming = imgIncoming.frames[idxNextIncomingFrame];
								if (!frameIncoming) {
									throw new Error(`Image ${idxNextIncomingImage}, frame `
										+ `${idxNextIncomingFrame} is required but was not `
										+ `supplied.  Make sure your source image hasn't been `
										+ `cropped or is otherwise missing tiles.`);
								}
								if (idxMasks[i]) {
									// Remask tile
									const { frVisible, frMask } = maskFromFrame({
										frame: frameIncoming,
										cb: p => {
											const alpha = p === piTrans;
											return [
												// Pass the pixel through unchanged, unless it's transparent
												// in which case use palette entry 0 instead.
												alpha ? 0x00 : p,
												// Set the mask pixel to palette entry 255 if it should be
												// transparent, otherwise use 0.
												alpha ? piMask : 0x00,
											];
										},
									});
									srcFrames[idxColours[i]] = frVisible;
									srcFrames[idxMasks[i]] = frMask;
								} else {
									// Tile is not masked
									srcFrames[idxColours[i]] = frameIncoming;
								}
								// Move on to the next frame in the current incoming image.
								idxNextIncomingFrame++;
							}
							// Move on to the next image in the array of incoming images.
							idxNextIncomingImage++;
						}
					},
				};
			}
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
		let files = {};
		let warnings = [];

		// We don't need to convert this.tileset etc. because we've already
		// overridden those functions inside open(), so when arc_exe_ddave
		// goes to read the data for each file, everything will get converted then.

		if (this.tileset.ega) {
			const generated = tls_ddave_ega.write(this.tileset.ega);
			files['egadave.dav'] = generated.content.main;
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
			// Undo the temporary transparency we added to avoid a warning message.
			let palCopy = this.palVGA.clone();
			palCopy.palette[PALETTE_TRANSPARENT][3] = 255;

			const generated = pal_vga_6bit.write(palCopy);
			warnings = warnings.concat(generated.warnings);
			return generated.content.main;
		};

		// Write out the .EXE file.
		const outputExe = arc_exe_ddave.generate(this.exe);
		files['dave.exe'] = outputExe.main;

		return {
			files,
			warnings,
		};
	}
}
