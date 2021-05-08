/*
 * Information about Cosmo's Cosmic Adventure.
 *
 * This game is documented on the ModdingWiki:
 *   http://www.shikadi.net/moddingwiki/Cosmo%27s_Cosmic_Adventure
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

const FORMAT_ID = 'game-cosmo';

import Debug from '../util/debug.js';
const debug = Debug.extend(FORMAT_ID);

import {
	decompressEXE,
	exe_cosmo1,
} from '@camoto/gamecode';
import { arc_vol_cosmo } from '@camoto/gamearchive';
import {
	Image,
	frameFromTileset,
	img_raw_planar_4bpp,
	tilesetFromFrame,
	tls_cosmo,
	tls_cosmo_masked,
	tls_cosmo_actrinfo,
} from '@camoto/gamegraphics';
import { map_cosmo } from '@camoto/gamemap';
import { mus_imf_idsoftware_type0 } from '@camoto/gamemusic';

import Game from '../interface/game.js';

function attributesToItems(attributes, prefix, cb)
{
	const matchedAttr = Object.keys(attributes)
		.filter(n => n.startsWith(prefix));
	for (const idAttr of matchedAttr) {
		const index = idAttr.substr(prefix.length); // chop off the prefix
		cb(index, attributes[idAttr]);
	}
}

// Open a tileset file and draw all the tiles in a grid on as a single image.
function tilesToImage({ content, widthTiles }) {
	const tiles = tls_cosmo.read({
		main: content,
	});
	// Convert tiles into single frame.
	let imgSingle = tiles.clone(0, 0);
	imgSingle.frames = [
		frameFromTileset(tiles, widthTiles),
	];
	imgSingle.width *= widthTiles;
	imgSingle.height *= tiles.frames.length / widthTiles;

	return imgSingle;
}

function imageToTiles({ newImage, pal }) {
	const tileCount = newImage.width * newImage.height / (8 * 8);

	// Prepare the list of sizes for each tile, but make them all the same.
	let tileDims = new Array(tileCount);
	tileDims.fill({
		width: 8, height: 8,
	});

	const newTiles = new Image({
		width: 8,
		height: 8,
		frames: tilesetFromFrame({
			frame: newImage.frames[0],
			frameWidth: newImage.width,
			frameHeight: newImage.height,
			tileDims,
			bg: 0,
		}),
		palette: pal,
	});

	return tls_cosmo.write(newTiles);
}

export default class Game_Cosmo extends Game
{
	static metadata() {
		let md = {
			...super.metadata(),
			id: FORMAT_ID,
			title: 'Cosmo\'s Cosmic Adventure',
		};

		return md;
	}

	static async identify(filesystem) {
		for (let episode = 1; episode <= 3; episode++) {
			const exeFilename = `cosmo${episode}.exe`;
			const exe = await filesystem.findFile(exeFilename);
			if (exe) {
				return {
					valid: true,
					reason: `Found ${exeFilename}.`,
				};
			}
		}

		return {
			valid: false,
			reason: 'Unable to find one or more of cosmo[123].exe.',
		};
	}

	constructor(filesystem) {
		super(filesystem);
	}

	async open() {
		let warnings = [];
		this.episodes = [
			{
				handler: exe_cosmo1,
			},
		];
		const handlers = [
			exe_cosmo1,
			//exe_cosmo2,
			//exe_cosmo3,
		];
		for (let epIndex = 0; epIndex < handlers.length; epIndex++) {
			let epNumber = epIndex + 1;
			let epData = this.episodes[epIndex];

			epData.exeFilename = `cosmo${epNumber}.exe`;
			try {
				epData.exeContent = {
					main: decompressEXE(await this.filesystem.read(epData.exeFilename)),
				};
				const identified = epData.handler.identify(epData.exeContent.main);
				if (!identified.valid) {
					warnings.push(`Episode ${epNumber} is unavailable due to `
						+ `${epData.exeFilename} being an unrecognised version: ${identified.reason}`);
				} else {
					epData.exe = epData.handler.extract(epData.exeContent);
				}
			} catch (e) {
				debug(e);
				warnings.push(`Episode ${epNumber} is unavailable due to an error `
					+ `while reading ${epData.exeFilename}: ${e.message}`);
				continue;
			}

			epData.volFilename = epData.exe.attributes['filename.archive.episode'].value;
			let content_vol = {
				main: await this.filesystem.read(epData.volFilename),
			};
			epData.vol = arc_vol_cosmo.parse(content_vol);
			debug(`Read ${epData.vol.files.length} files from ${epData.volFilename}`);

			epData.stnFilename = epData.exe.attributes['filename.archive.standard'].value;
			let content_stn = {
				main: await this.filesystem.read(epData.stnFilename),
			};
			epData.stn = arc_vol_cosmo.parse(content_stn);
			debug(`Read ${epData.stn.files.length} files from ${epData.stnFilename}`);
		}

		return warnings;
	}

	readEpisode(epIndex) {
		let epData = this.episodes[epIndex];

		const rename = async (attr, newName) => {
			newName = newName.toUpperCase();
			const oldName = attr.value.toUpperCase();
			debug(`Renaming ${oldName} to ${newName}`);

			if (
				[
					'filename.archive.episode',
					'filename.archive.standard',
				].includes(attr.id)
			) {
				// Special case for renaming the VOL and STN files.
				await this.filesystem.rename(newName.toLowerCase(), oldName);

			} else {
				// File being renamed must be within one of the VOL or STN archives.
				let renamed = false;
				for (const f of epData.vol.files) {
					if (f.name.toUpperCase() === oldName) {
						f.name = newName;
						renamed = true;
						break;
					}
				}
				if (!renamed) {
					// File wasn't found in the .VOL, try the .STN.
					for (const f of epData.stn.files) {
						if (f.name.toUpperCase() === oldName) {
							f.name = newName;
							renamed = true;
							break;
						}
					}
				}
				if (!renamed) {
					throw new Error(`Unable to find ${oldName} in the .VOL or .STN archive.`);
				}
			}

			// File was renamed successfully, update attribute.
			attr.value = newName;
		};

		// Find a file in this episode's .vol or .stn archives.
		function getFileVOL(filename) {
			const fileUpper = filename.toUpperCase();
			let file = epData.vol.files.find(f => f.name.toUpperCase() === fileUpper);
			if (!file) {
				file = epData.stn.files.find(f => f.name.toUpperCase() === fileUpper);
				if (!file) {
					throw new Error(`Unable to find "${filename}" in the VOL or STN `
						+ `archives "${epData.volFilename}" or "${epData.stnFilename}".`);
				}
			}

			return file;
		}

		// Extract all the "filename.music.*" attributes and populate them as a
		// list of songs.
		let songs = {};
		attributesToItems(epData.exe.attributes, 'filename.music.', (index, attr) => {
			const filename = attr.value;

			// Function to extract the raw song file.
			const fnExtract = () => getFileVOL(filename).getContent();

			// Function to overwrite the song file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileVOL(filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			// Add the song to the list of items.
			songs[`music.${index}`] = {
				title: `Song ${index}`,
				subtitle: filename,
				type: Game.ItemTypes.Music,
				fnExtract: fnExtract,
				fnReplace: fnReplace,

				// Function to open the file and return a Music instance.
				fnOpen: () => {
					const content = {
						main: fnExtract(),
					};
					return mus_imf_idsoftware_type0.parse(content);
				},

				// Function to check the Music instance is ok to save.
				fnPresaveCheck: obj => mus_imf_idsoftware_type0.checkLimits(obj),

				// Function to convert the Music instance back into binary data and
				// overwrite the file.
				fnSave: obj => {
					// Convert the Music instance back into binary file data.
					const { warnings, content } = mus_imf_idsoftware_type0.generate(obj);
					fnReplace(content.main);
					return warnings;
				},

				// Function to rename the file inside the .vol and update the .exe to
				// refer to the new name.
				fnRename: newName => rename(attr, newName),
			};
		});

		let tiles = {};
		attributesToItems(epData.exe.attributes, 'filename.tileset.', (index, attr) => {
			const filename = attr.value;

			// Function to extract the raw song file.
			const fnExtract = () => getFileVOL(filename).getContent();

			// Function to overwrite the song file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileVOL(filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			// These tilesets include transparency.
			const masked = [
				'masked',
			].includes(index);

			const handler = masked ? tls_cosmo_masked : tls_cosmo;

			tiles[`tiles.${index}`] = {
				title: 'Tiles ' + index,
				subtitle: filename,
				type: Game.ItemTypes.Image,
				fnExtract: fnExtract,
				fnReplace: fnReplace,
				fnOpen: () => {
					let tiles = handler.read({
						main: fnExtract(),
					});

					// Each file has a different 'preferred width'.
					tiles.fixedWidth = {
						'statusbar': 38,
						'level': 40,
						'masked': 40,
					}[index] || 10;

					return tiles;
				},
				fnSave: (newImage) => {
					const { warnings, content } = handler.write(newImage);
					fnReplace(content.main);
					return {
						warnings,
					};
				},
				fnRename: newName => rename(attr, newName),
			};
		});
		attributesToItems(epData.exe.attributes, 'filename.tiles.', (index, attr) => {
			const filename = attr.value;
			const filenameFAT = epData.exe.attributes[`filename.tileinfo.${index}`].value;

			// Function to extract the raw song file.
			const fnExtract = () => getFileVOL(filename).getContent();
			const fnExtractFAT = () => getFileVOL(filenameFAT).getContent();

			// Function to overwrite the song file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileVOL(filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};
			const fnReplaceFAT = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileVOL(filenameFAT);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			tiles[`tiles.${index}`] = {
				title: 'Tiles ' + index,
				subtitle: filename,
				type: Game.ItemTypes.Image,
				fnExtract: fnExtract,
				fnReplace: fnReplace,
				fnOpen: () => tls_cosmo_actrinfo.read({
					main: fnExtract(),
					info: fnExtractFAT(),
				}),
				fnSave: (newImage) => {
					const { warnings, content } = tls_cosmo_actrinfo.write(newImage);
					fnReplace(content.main);
					fnReplaceFAT(content.info);
					return {
						warnings,
					};
				},
				fnRename: newName => rename(attr, newName),
			};
		});

		// Same for the levels.
		let levels = {};
		attributesToItems(epData.exe.attributes, 'filename.level.', (index, attr) => {
			const filename = attr.value;
			const isBonus = index.startsWith('bonus.');
			const levelNumber = isBonus ? index.substr(6) : index;

			// Function to extract the raw song file.
			const fnExtract = () => getFileVOL(filename).getContent();

			// Function to overwrite the song file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileVOL(filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			levels[`level.${index}`] = {
				title: (isBonus ? 'Bonus level' : 'Level') + ' ' + levelNumber,
				subtitle: filename,
				type: Game.ItemTypes.Map,
				fnExtract: fnExtract,
				fnReplace: fnReplace,
				fnOpen: () => {
					let map = map_cosmo.parse({main: fnExtract()});
					return map;
				},
				fnRename: newName => rename(attr, newName),
			};
		});

		let b800 = {};
		attributesToItems(epData.exe.attributes, 'filename.b800.', (index, attr) => {
			const filename = attr.value;
			const titles = {
				'nomemory': 'Not enough memory error',
				'farewell': 'Exit screen',
			};
			b800[`b800.${index}`] = {
				title: titles[index] || index,
				subtitle: filename,
				type: Game.ItemTypes.B800,
				fnOpen: () => this.openB800(filename),
				fnRename: newName => rename(attr, newName),
			};
		});

		let backdrops = {};
		attributesToItems(epData.exe.attributes, 'filename.backdrop.', (index, attr) => {
			const filename = attr.value;

			// Function to extract the raw file.
			const fnExtract = () => getFileVOL(filename).getContent();

			// Function to overwrite the file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileVOL(filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			// See if the file exists, for use below.
			const fileUpper = filename.toUpperCase();
			const file = epData.vol.files.find(f => f.name.toUpperCase() === fileUpper);

			backdrops[`backdrop.${index}`] = {
				title: `Backdrop ${index}`,
				subtitle: filename,
				// Disable it if it can't be found in the archive.  The .exe supports
				// more backdrops/filenames than are shipped with the game, so we allow
				// use of them all, but some of them require additional files to be
				// added to the archive.
				disabled: !file,
				disabledReason: `File "${fileUpper}" does not exist in ${epData.volFilename}.`,
				type: Game.ItemTypes.Image,
				fnExtract,
				fnReplace,
				fnOpen: () => tilesToImage({
					content: fnExtract(),
					widthTiles: 40,
				}),
				fnSave: (newImage) => {
					const { warnings, content } = imageToTiles({
						newImage,
						pal: newImage.palette, // TODO: Use game palette, defaulting to EGA
					});
					fnReplace(content.main);
					return {
						warnings,
					};
				},
				fnRename: newName => rename(attr, newName),
			};
		});

		let sounds = {};
		attributesToItems(epData.exe.attributes, 'filename.sounds.', (index, attr) => {
			const filename = attr.value;
			sounds[`sounds.${index}`] = {
				title: `Sound effects ${index}`,
				subtitle: filename,
				type: Game.ItemTypes.Sound,
				fnOpen: () => this.openSounds(filename),
				fnRename: newName => rename(attr, newName),
			};
		});

		let splash = {};
		attributesToItems(epData.exe.attributes, 'filename.splash.', (index, attr) => {
			const filename = attr.value;
			const titles = {
				'pretitle': 'Apogee logo',
				'title': 'Title screen',
				'credits': 'Credits',
				'loading': 'Loading',
				'bonus': 'Bonus level',
				'end': 'Game finished',
			};

			// Function to extract the raw image file.
			const fnExtract = () => getFileVOL(filename).getContent();

			// Function to overwrite the file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileVOL(filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			splash[`splash.${index}`] = {
				title: titles[index] || index,
				subtitle: filename,
				type: Game.ItemTypes.Image,
				fnExtract,
				fnReplace,

				// Function to open the file and return an Image instance.
				fnOpen: () => {
					const content = {
						main: fnExtract(),
					};
					return img_raw_planar_4bpp.read(content, {
						width: 320,
						height: 200,
					});
				},
				fnSave: (content) => {
					const outContent = img_raw_planar_4bpp.write(content, {
						width: 320,
						height: 200,
					});
					fnReplace(outContent.content.main);

					return {
						warnings: outContent.warnings,
					};
				},

				fnRename: newName => rename(attr, newName),
			};
		});

		return {
			'levels': {
				title: 'Levels',
				type: Game.ItemTypes.Folder,
				children: levels,
			},
			'tiles': {
				title: 'Tiles',
				type: Game.ItemTypes.Folder,
				children: tiles,
			},
			'backdrop': {
				title: 'Level backgrounds',
				type: Game.ItemTypes.Folder,
				children: backdrops,
			},
			'music': {
				title: 'Music',
				type: Game.ItemTypes.Folder,
				children: songs,
			},
			'sound': {
				title: 'Sound effects', // TODO: Merge these files into a single sfx entry?
				type: Game.ItemTypes.Folder,
				children: sounds,
			},
			'b800': {
				title: 'Text-mode splash screens',
				type: Game.ItemTypes.Folder,
				children: b800,
			},
			'splash': {
				title: 'Graphics-mode splash screens',
				type: Game.ItemTypes.Folder,
				children: splash,
			},
			'misc': {
				title: 'Misc',
				type: Game.ItemTypes.Folder,
				children: {
					'attributes': {
						title: 'Attributes',
						type: Game.ItemTypes.Attributes,
						fnOpen: () => this.openAttributes(epData.exe.attributes),
					},
				},
			},
		};
	}

	async items() {
		let items = [];
		for (let epIndex = 0; epIndex < this.episodes.length; epIndex++) {
			let epNumber = epIndex + 1;
			const exe = this.episodes[epIndex].exe;
			if (exe) { // cosmoX.exe present
				items[`e${epNumber}`] = {
					title: `Episode ${epNumber}`,
					type: Game.ItemTypes.Folder,
					children: this.readEpisode(epIndex),
				};
			}
		}

		return items;
	}

	async preflight() {
		let warnings = [];

		for (let epIndex = 0; epIndex < this.episodes.length; epIndex++) {
			let epNumber = epIndex + 1;
			const exe = this.episodes[epIndex].exe;
			if (!exe) continue;

			const attr = exe.attributes['filename.savegame.template'];
			if (attr.value === `COSMO${epNumber}.SV `) {
				warnings.push({
					severity: Game.Severity.Important,
					summary: 'Saved game filename template unchanged',
					detail: 'The template used to construct filenames for saved games '
						+ 'has not been changed.  This will cause your mod to share its '
						+ 'saved games with the original unmodified game, allowing saved '
						+ 'games from the original to be loaded inside your mod, possibly '
						+ 'allowing unintentional access to other levels.\n\n'
						+ 'It is recommended to change the template so that it is unique '
						+ 'for your mod to avoid this problem.  This will also prevent '
						+ 'games saved while in your mod from overwriting saved games '
						+ 'belonging to the original unmodified game.\n\n'
						+ 'The value is located in the "filename.savegame.template" '
						+ 'attribute in the game\'s .exe file.',
				});
			}
		}

		return warnings;
	}

	async save() {
		let files = {};
		let warnings = [];

		for (let epIndex = 0; epIndex < this.episodes.length; epIndex++) {
			const epData = this.episodes[epIndex];
			if (!epData) continue; // missing episode

			// Write out the .VOL archive.
			const outputVol = arc_vol_cosmo.generate(epData.vol);
			const volFilename = epData.exe.attributes['filename.archive.episode'].value;
			files[volFilename] = outputVol.main;

			// Write out the .STN archive.
			const outputStn = arc_vol_cosmo.generate(epData.stn);
			const stnFilename = epData.exe.attributes['filename.archive.standard'].value;
			files[stnFilename] = outputStn.main;

			// Write out any changes to the .EXE file.
			const outputExe = epData.handler.patch(epData.exeContent, epData.exe);
			files[epData.exeFilename] = outputExe.main;
		}

		return {
			files,
			warnings,
		};
	}
}
