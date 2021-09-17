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

import {
	decompressEXE,
	exe_ddave,
} from '@camoto/gamecode';
import { arc_exe_ddave } from '@camoto/gamearchive';
import {
	Frame,
	Image,
	frameFromMask,
	maskFromFrame,
	pal_vga_6bit,
	tls_ddave_cga,
	tls_ddave_ega,
	tls_ddave_vga,
} from '@camoto/gamegraphics';
import { map_ddave } from '@camoto/gamemap';

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
			// Decompress the EXE.
			const content_exe = {
				main: decompressEXE(await this.filesystem.read(exeFilename)),
			};

			// Read all the files out of it.
			const identified = arc_exe_ddave.identify(content_exe.main);
			if (!identified.valid) {
				debug(`identify() failed for ${exeFilename}: ${identified.reason}`);
				warnings.push(`${exeFilename} could not be positively identified.  It `
					+ `may be an unsupported version, modified, or corrupted.  `
					+ `Proceeding, you may encounter corruption.  If this is an `
					+ `official, unmodified version of the game, please report it so we `
					+ `can add support for it.`);
			}
			this.exeArchive = arc_exe_ddave.parse(content_exe);
			debug(`Read ${this.exeArchive.files.length} files from ${exeFilename}`);

			// Read the fields out of it.
			const identified2 = exe_ddave.identify(content_exe.main);
			if (!identified2.valid) {
				debug(`identify() failed for ${exeFilename}: ${identified2.reason}`);
				warnings.push(`${exeFilename} could not be positively identified.  It `
					+ `may be an unsupported version, modified, or corrupted.  `
					+ `Proceeding, you may encounter corruption.  If this is an `
					+ `official, unmodified version of the game, please report it so we `
					+ `can add support for it.`);
			}
			this.exeFields = exe_ddave.extract(content_exe);

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
				let fileGfx = this.exeArchive.files.find(f => f.name.toLowerCase() === filename);
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

		const filePalVGA = this.exeArchive.files.find(f => f.name.toLowerCase() === 'vga.pal');
		this.palVGA = pal_vga_6bit.read({
			main: filePalVGA.getContent(),
		});

		return warnings;
	}

	async items() {

		let gfx = this.loadAllTilesets();

		gfx['vga-palette'] = {
			title: 'VGA - Palette',
			type: Game.ItemTypes.Palette,
			fnOpen: () => this.palVGA.palette,
			fnSave: newPal => this.palVGA.palette = newPal,
		};

		// Level border
		{
			const filename = `border.raw`;
			let file = this.exeArchive.files.find(f => f.name.toLowerCase() === filename);
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

			gfx['border'] = {
				title: 'Map border',
				type: Game.ItemTypes.Image,
				fnExtract,
				fnReplace,
				fnOpen: () => new Image({
					width: file.nativeSize - 1,
					height: 1,
					frames: [
						new Frame({
							pixels: fnExtract(),
						}),
					],
					palette: this.palVGA.palette,
				}),
			};
		}

		// A list of gamecode.js attribute keys we don't want to display to the
		// user, because we are supplying them via other means (e.g. the attributes
		// for the player start coordinates are exposed via the map editor instead).
		const hideKeys = [
			'map.startX.',
			'map.startY.',
		];

		return {
			'levels': {
				title: 'Levels',
				type: Game.ItemTypes.Folder,
				children: this.loadAllLevels(gfx),
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
				disabled: true,
				disabledReason: 'PC Speaker sounds not yet implemented.',
			},
			'attributes': {
				title: `Attributes`,
				type: Game.ItemTypes.Attributes,
				fnOpen: () => {
					let visibleAttributes = {};
					Object
						.keys(this.exeFields.attributes)
						// Filter out every key that starts with a value in hideKeys[].
						.filter(k => !hideKeys.find(hk => k.startsWith(hk)))
						.forEach(k => visibleAttributes[k] = this.exeFields.attributes[k]);
					return visibleAttributes;
				},
				fnSave: newAttributes => {
					// Just replace the ones we get back, since we supplied an incomplete
					// list and we don't want to lose the attributes we hid.
					this.exeFields.attributes = {
						...this.exeFields.attribues,
						...newAttributes,
					};
				},
			},
		};
	}

	async preflight() {
		let warnings = [];

		const attr = this.exeFields.attributes['filename.scores'];
		if (attr.value === `DSCORES.DAV`) {
			warnings.push({
				severity: Game.Severity.Important,
				summary: 'High scores filename template unchanged',
				detail: 'The filename used to save high scores to has not been '
					+ 'changed.  This will cause your mod to share its high scores '
					+ 'with the original unmodified game if it is run in the same folder '
					+ 'as the original game.\n\n'
					+ 'It is recommended to change the filename so that it is unique '
					+ 'to your mod to avoid this conflict.\n\n'
					+ 'The value is located in the "Attributes" item under the '
					+ '"filename.scores" entry.',
			});
		}

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
				let fileGfx = this.exeArchive.files.find(f => f.name.toLowerCase() === filename);

				fileGfx.getContent = () => {
					const generated = tilesetHandler[xga].write(this.tileset[xga]);
					warnings = warnings.concat(generated.warnings);
					return generated.content.main;
				};
			}
		}

		const filePalVGA = this.exeArchive.files.find(f => f.name.toLowerCase() === 'vga.pal');
		filePalVGA.getContent = () => {
			const generated = pal_vga_6bit.write(this.palVGA);
			warnings = warnings.concat(generated.warnings);
			return generated.content.main;
		};

		// Write out the .EXE file.
		const outputExe = arc_exe_ddave.generate(this.exeArchive);

		// Patch the new .EXE file.
		const patchedExe = exe_ddave.patch(outputExe, this.exeFields);

		files['dave.exe'] = patchedExe.main;

		return {
			files,
			warnings,
		};
	}

	loadAllTilesets() {
		const palIndexTransparent = {
			cga: [3, 4],      // one more than full palette
			ega: [15, 16],    // one more than full palette
			vga: [255, PALETTE_TRANSPARENT], // random colour that isn't used in the original game
		};

		// Map codes in game-ddave-tileset-split.js into user-visible titles.
		const friendlyNames = {
			map: 'Map tiles',
			player: 'Player sprites',
			monsters: 'Monster sprites',
			ui: 'Interface',
			title: 'Title screen',
			font: 'Status bar font',
		};

		let gfx = {};
		for (const xga of ['cga', 'ega', 'vga']) {
			if (!this.tileset[xga]) continue; // might be missing egadave.dav
			const XGA = xga.toUpperCase();

			const srcFrames = this.tileset[xga].frames;
			const [ piMask, piTrans ] = palIndexTransparent[xga];
			for (const [ spriteId, spriteIndex ] of Object.entries(tilesetSplit[xga])) {
				gfx[`${xga}-${spriteId}`] = {
					title: `${XGA} - ${friendlyNames[spriteId]}`,
					type: Game.ItemTypes.Image,
					limits: {
						writePalette: false,
					},
					fnOpen: () => this.loadTileset(xga, srcFrames, spriteId, spriteIndex, piMask, piTrans),
					fnSave: newImg => this.saveTileset(newImg, xga, srcFrames, spriteIndex, piMask, piTrans),
				};
			}
		}

		return gfx;
	}

	loadTileset(xga, srcFrames, spriteId, spriteIndex, piMask, piTrans) {
		// Prepare the palette here, so that we update it every time an item
		// is opened.  If we do it earlier, it'll get cached in the fixture
		// images won't use a new palette until everything is reloaded.
		let palTrans, palNorm;
		if (xga === 'vga') {
			// For VGA, pick an unused colour and make it transparent.
			palNorm = this.palVGA.palette;
			palTrans = palNorm.clone();
			const c = piTrans;
			palTrans[c] = [0xFF, 0x01, 0xFF, 0x00];
		} else {
			// For CGA and EGA, add an extra palette entry for transparency.
			palNorm = this.tileset[xga].palette;
			palTrans = palNorm.clone();
			palTrans.push([0xFF, 0x01, 0xFF, 0x00]);
		}

		let sprites = [];
		for (const [ idxColours, idxMasks, idxOrder, tDelay ] of spriteIndex) {
			let sprite = this.tileset[xga].clone(0, 0);
			if (idxMasks.length) {
				// Masked tile, use the palette with a transparent entry.
				sprite.palette = palTrans;
			} else {
				sprite.palette = palNorm;
			}

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

			// There's a special case for the map tiles.  These aren't masked
			// but we use the transparent palette anyway, because there is a
			// prime number of tiles so no matter how we arrange them in a
			// rectangular tileset there will always be at least one leftover
			// space.  Normally this will be black making it look like there
			// are extra tiles available, but with the transparent palette
			// available it will get marked as transparent when frameCompose()
			// looks for a transparent background colour, hopefully making it
			// clearer it's not a real usable tile.
			if (spriteId === 'map') {
				sprite.palette = palTrans;
			}
			sprites.push(sprite);
		}
		return sprites;
	}

	saveTileset(newImg, xga, srcFrames, spriteIndex, piMask, piTrans) {
		let idxNextIncomingImage = 0;
		for (const [ idxColours, idxMasks, /* idxOrder, tDelay */ ] of spriteIndex) {
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

					// We need per-frame dimensions here but the incoming image
					// may only have image-level dimensions (not per-frame
					// dimensions, since it's a single image) so copy across the
					// whole-image dimensions if we don't have per-frame ones.
					// Otherwise we'll end up writing the frame as a 0x0 picture.
					let newFrame = frameIncoming.clone();
					if (!newFrame.width) newFrame.width = imgIncoming.width;
					if (!newFrame.height) newFrame.height = imgIncoming.height;

					srcFrames[idxColours[i]] = newFrame;
				}
				// Move on to the next frame in the current incoming image.
				idxNextIncomingFrame++;
			}
			// Move on to the next image in the array of incoming images.
			idxNextIncomingImage++;
		}
	}

	loadAllLevels(gfx) {
		let levels = {};
		for (let i = 0; i < 11; i++) {
			const padLevel = i ? i.toString().padStart(2, '0') : 't';

			// Find the main map file.
			const filename = `level${padLevel}.dav`;
			let file = this.exeArchive.files.find(f => f.name.toLowerCase() === filename);
			if (!file) {
				throw new Error(`Unable to find "${filename}" inside dave.exe.`);
			}

			// Find the enemy data.
			const filenameE = `enemy${padLevel}.dav`;
			let fileE = this.exeArchive.files.find(f => f.name.toLowerCase() === filenameE);
			// Ignore missing file as there won't be one for the title level.

			// Function to extract the raw file.
			const fnExtract = () => file.getContent();

			// Function to overwrite the file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				file.getContent = () => content;
				file.diskSize = file.nativeSize = content.length;
			};

			levels[`level.${i}`] = {
				title: i ? `Level ${i}` : 'Title level',
				subtitle: filename,
				type: Game.ItemTypes.Map,
				fnExtract,
				fnReplace,
				fnOpen: () => {
					let map = map_ddave.parse({
						main: fnExtract(),
						enemy: fileE && fileE.getContent(),
					}, {
						playerStartX: this.exeFields[`map.startX.${i}`],
						playerStartY: this.exeFields[`map.startY.${i}`],
						monsterTileIndex: Math.max(0, i - 3),
					});

					// TODO: How to pick CGA/EGA/VGA tileset?
					const tilesetType = 'vga';

					// Convert frames into images.
					const tsBG = gfx[`${tilesetType}-map`].fnOpen();
					let tiles = [];
					for (let f = 0; f < 53; f++) {
						const fr = tsBG[0].frames[f];
						tiles.push(new Image({
							width: fr.width,// || srcTileset.width,
							height: fr.height,// || srcTileset.height,
							//palette: (tilesetType === 'vga') ? this.palVGA.palette : undefined,
							palette: tsBG[0].palette,
							frames: [fr],
						}));
					}
					// Animate some tiles.
					tiles[6].frames.push( // fire
						tiles[7].frames[0],
						tiles[8].frames[0],
						tiles[9].frames[0],
					);
					tiles[10].frames.push( // trophy
						tiles[11].frames[0],
						tiles[12].frames[0],
						tiles[13].frames[0],
						tiles[14].frames[0],
					);
					tiles[25].frames.push( // weirdweeds
						tiles[26].frames[0],
						tiles[27].frames[0],
						tiles[28].frames[0],
					);
					tiles[36].frames.push( // water
						tiles[37].frames[0],
						tiles[38].frames[0],
						tiles[39].frames[0],
						tiles[40].frames[0],
					);

					map.setTilesets({
						background: tiles,
						monsters: gfx[`${tilesetType}-monsters`].fnOpen(),
						player: gfx[`${tilesetType}-player`].fnOpen(),
					});
					map.animationDelay = 150;

					return map;
				},
			};
		}

		return levels;
	}
}
