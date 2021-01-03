/**
 * @file Information about Cosmo's Cosmic Adventure.
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

import GameCode_exe_cosmo1 from '@camoto/gamecode/formats/exe-cosmo1.js';
import GameCodeDecompress from '@camoto/gamecode/util/decompress.js';
import Game from '../interface/game.js';

import Archive_VOL from '@camoto/gamearchive/formats/arc-vol-cosmo.js';

function attributesToItems(attributes, prefix, cb)
{
	const matchedAttr = Object.keys(attributes)
		.filter(n => n.startsWith(prefix));
	for (const idAttr of matchedAttr) {
		const index = idAttr.substr(prefix.length); // chop off the prefix
		cb(index, attributes[idAttr]);
	}
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
				handler: GameCode_exe_cosmo1,
			},
		];
		const handlers = [
			GameCode_exe_cosmo1,
			//GameCode_exe_cosmo2,
			//GameCode_exe_cosmo3,
		];
		for (let epIndex = 0; epIndex < handlers.length; epIndex++) {
			let epNumber = epIndex + 1;
			let epData = this.episodes[epIndex];

			epData.exeFilename = `cosmo${epNumber}.exe`;
			try {
				epData.exeContent = {
					main: GameCodeDecompress(await this.filesystem.read(epData.exeFilename)),
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
			}

			const volFilename = epData.exe.attributes['filename.archive.episode'].value;
			let content_vol = {
				main: await this.filesystem.read(volFilename),
			};
			epData.vol = Archive_VOL.parse(content_vol);
			debug(`Read ${epData.vol.files.length} files from ${volFilename}`);

			const stnFilename = epData.exe.attributes['filename.archive.standard'].value;
			let content_stn = {
				main: await this.filesystem.read(stnFilename),
			};
			epData.stn = Archive_VOL.parse(content_stn);
			debug(`Read ${epData.stn.files.length} files from ${stnFilename}`);
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

		// Extract all the "filename.music.*" attributes and populate them as a
		// list of songs.
		let songs = {};
		attributesToItems(epData.exe.attributes, 'filename.music.', (index, attr) => {
			const filename = attr.value;
			songs[`music.${index}`] = {
				title: `Song ${index}`,
				subtitle: filename,
				type: Game.ItemTypes.Music,
				fnOpen: () => this.openMusic(filename),
				fnRename: newName => rename(attr, newName),
			};
		});

		// Same for the levels.
		let levels = {};
		attributesToItems(epData.exe.attributes, 'filename.level.', (index, attr) => {
			const filename = attr.value;
			const isBonus = index.startsWith('bonus.');
			const levelNumber = isBonus ? index.substr(6) : index;
			levels[`level.${index}`] = {
				title: (isBonus ? 'Bonus level' : 'Level') + ' ' + levelNumber,
				subtitle: filename,
				type: Game.ItemTypes.Map,
				fnOpen: () => this.openMap(filename),
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
			};
		});

		let backdrops = {};
		attributesToItems(epData.exe.attributes, 'filename.backdrop.', (index, attr) => {
			const filename = attr.value;
			backdrops[`backdrop.${index}`] = {
				title: `Backdrop ${index}`,
				subtitle: filename,
				type: Game.ItemTypes.Image,
				fnOpen: () => this.openBackdrop(filename),
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
			};
		});

		return {
			'levels': {
				title: 'Levels',
				type: Game.ItemTypes.Folder,
				children: levels,
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
			'textSplash': {
				title: 'Text-mode splash screens',
				type: Game.ItemTypes.Folder,
				children: b800,
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
		for (let epIndex = 0; epIndex < this.episodes.length; epIndex++) {
			let epNumber = epIndex + 1;
			const epData = this.episodes[epIndex];

			// Write out the .VOL archive.
			const outputVol = Archive_VOL.generate(epData.vol);
			const volFilename = epData.exe.attributes['filename.archive.episode'].value;
			await this.filesystem.write(volFilename, outputVol.main);

			// Write out the .STN archive.
			const outputStn = Archive_VOL.generate(epData.stn);
			const stnFilename = epData.exe.attributes['filename.archive.standard'].value;
			await this.filesystem.write(stnFilename, outputStn.main);

			// Write out any changes to the .EXE file.
			const outputExe = epData.handler.patch(epData.exeContent, epData.exe);
			await this.filesystem.write(epData.exeFilename, outputExe.main);
		}
	}
};
