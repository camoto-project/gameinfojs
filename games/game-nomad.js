/*
 * Information about Nomad.
 *
 * This game is documented on the ModdingWiki:
 *   http://www.shikadi.net/moddingwiki/Nomad
 *
 * Copyright (C) 2010-2021 Adam Nielsen <malvineous@shikadi.net>
 * Copyright (C) 2021 Colin Bourassa
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

const FORMAT_ID = 'game-nomad';

import Debug from '../util/debug.js';
const debug = Debug.extend(FORMAT_ID);

import {
	exe_nomad
} from '@camoto/gamecode';
import {
	pal_vga_6bit_papyrus,
	img_raw_linear_8bpp,
	Image_Stp_V2,
	Image_Rol_V2,
	img_del,
	img_pln,
	paletteVGA256
} from '@camoto/gamegraphics';

import Game from '../interface/game.js';
import {
	arc_dat_papyrus_v1
} from '@camoto/gamearchive';

const exeFilename = 'nomad.exe';

function attributesToItems(attributes, prefix, cb) {
	const matchedAttr = Object.keys(attributes)
		.filter(n => n.startsWith(prefix));
	for (const idAttr of matchedAttr) {
		const index = idAttr.substr(prefix.length); // chop off the prefix
		cb(index, attributes[idAttr]);
	}
}

export default class Game_Nomad extends Game {
	static metadata() {
		let md = {
			...super.metadata(),
			id: FORMAT_ID,
			title: 'Nomad',
		};

		return md;
	}

	static async identify(filesystem) {
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

		try {
			this.exeContent = await this.filesystem.read(exeFilename);
			const identified = exe_nomad.identify(this.exeContent);
			if (!identified.valid) {
				debug(`identify() failed for ${exeFilename}: ${identified.reason}`);
				warnings.push(`${exeFilename} could not be positively identified.  It ` +
					`may be an unsupported version, modified, or corrupted.  ` +
					`Proceeding, you may encounter corruption.  If this is an ` +
					`official, unmodified version of the game, please report it so we ` +
					`can add support for it.`);
			} else {
				this.exe = exe_nomad.extract({
					main: this.exeContent
				});
			}
		} catch (e) {
			debug(e);
			throw new Error(`Unable to continue, error while reading ${exeFilename}: ${e.message}`);
		}

		this.datAnimFilename = this.exe.attributes['filename.dat.anim'].value;
		this.datConverseFilename = this.exe.attributes['filename.dat.converse'].value;
		this.datInventFilename = this.exe.attributes['filename.dat.invent'].value;
		this.datSamplesFilename = this.exe.attributes['filename.dat.samples'].value;
		this.datTestFilename = this.exe.attributes['filename.dat.test'].value;

		let content_anim = {
			main: await this.filesystem.read(this.datAnimFilename),
		};
		this.datAnim = arc_dat_papyrus_v1.parse(content_anim);
		debug(`Read ${this.datAnim.files.length} files from ${this.datAnimFilename}`);

		let content_converse = {
			main: await this.filesystem.read(this.datConverseFilename),
		};
		this.datConverse = arc_dat_papyrus_v1.parse(content_converse);
		debug(`Read ${this.datConverse.files.length} files from ${this.datConverseFilename}`);

		let content_invent = {
			main: await this.filesystem.read(this.datInventFilename),
		};
		this.datInvent = arc_dat_papyrus_v1.parse(content_invent);
		debug(`Read ${this.datInvent.files.length} files from ${this.datInventFilename}`);

		let content_samples = {
			main: await this.filesystem.read(this.datSamplesFilename),
		};
		this.datSamples = arc_dat_papyrus_v1.parse(content_samples);
		debug(`Read ${this.datSamples.files.length} files from ${this.datSamplesFilename}`);

		let content_test = {
			main: await this.filesystem.read(this.datTestFilename),
		};
		this.datTest = arc_dat_papyrus_v1.parse(content_test);
		debug(`Read ${this.datTest.files.length} files from ${this.datTestFilename}`);

		return warnings;
	}

	async items() {

		// Find a file in the provided DAT archive
		function getFileFromDat(dat, filename) {
			let file = dat.files.find(f => f.name === filename);
			if (!file) {
				throw new Error(`Unable to find "${filename}" in DAT.`);
			}
			return file;
		}

		// The GAME.PAL palette is used for all Stamp (.stp) and Stamp Roll (.rol) images,
		// so read it once at the start.
		const gamePalContent = {
			main: getFileFromDat(this.datTest, 'GAME.PAL').getContent()
		};
		const gamePal = pal_vga_6bit_papyrus.read(gamePalContent).palette;

		//
		// Fullscreen images and cinematic backdrops
		//
		let fullscreen = {};
		attributesToItems(this.exe.attributes, 'filename.fullscreen.', (index, attr) => {
			const titles = {
				'backg': 'Title screen planetary background',
				'cock1': 'Cockpit zoom animation, frame 1',
				'cock2': 'Cockpit zoom animation, frame 2',
				'cock3': 'Cockpit zoom animation, frame 3',
				'cock4': 'Cockpit zoom animation, frame 4',
				'cock5': 'Cockpit zoom animation, frame 5',
				'crashed': 'Crashed ship in snow',
				'cred0001': 'Credits, page 1',
				'cred0002': 'Credits, page 2',
				'cred0003': 'Credits, page 3',
				'cred0004': 'Credits, page 4',
				'cred0005': 'Credits, page 5',
				'cred0006': 'Credits, page 6',
				'end1a': 'Player\'s crashed escape pod scene, exterior',
				'end1b': 'Player\'s crashed escape pod scene, interior',
				'fixed': 'Repaired ship in hangar',
				'getname': 'Cockpit newgame screen',
				'korok01': 'Endgame scene, Korok victory',
				'korok02': 'Endgame scene, Korok victory',
				'oesi': 'OESI logo',
				'open08': 'Earthscape',
				'snow': 'Intro cinematic snow field',
				'win01': 'Endgame scene, Alliance victory',
				'win03': 'Endgame scene, Alliance victory',
				'win04': 'Endgame scene, Alliance victory',
			};

			const palettes = {
				'backg': 'backg.pal',
				'cock1': 'backg.pal',
				'cock2': 'backg.pal',
				'cock3': 'backg.pal',
				'cock4': 'backg.pal',
				'cock5': 'backg.pal',
				'crashed': 'backg.pal',
				'cred0001': 'cred0001.pal',
				'cred0002': 'cred0001.pal',
				'cred0003': 'cred0001.pal',
				'cred0004': 'cred0001.pal',
				'cred0005': 'cred0001.pal',
				'cred0006': 'cred0001.pal',
				'end1a': 'end1a.pal',
				'end1b': 'end1b.pal',
				'fixed': 'backg.pal',
				'getname': 'getname.pal',
				'korok01': 'korok01.pal',
				'korok02': 'korok02.pal',
				'oesi': 'backg.pal',
				'open08': 'open08.pal',
				'snow': 'backg.pal',
				'win01': 'win01.pal',
				'win03': 'win03.pal',
				'win04': 'win04.pal',
			};

			// Depending on the area of the game's code in which a fullscreen image
			// is used, the file extension (.lbm) is sometimes omitted.
			// Add it if necessary.
			let filename = attr.value;
			if (filename.substr(filename.length - 4) !== '.lbm') {
				filename = filename + '.lbm';
			}

			// Function to extract the raw image file.
			const fnExtract = () => getFileFromDat(this.datTest, filename).getContent();

			// Function to overwrite the file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileFromDat(this.datTest, filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			fullscreen[`fullscreen.${index}`] = {
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

					let imgData = img_raw_linear_8bpp.read(content, {
						width: 320,
						height: 200,
					});

					if (index in palettes) {
						const palContent = {
							main: getFileFromDat(this.datTest, palettes[index]).getContent()
						};
						const pal = pal_vga_6bit_papyrus.read(palContent);
						imgData.palette = pal.palette;
					}

					return imgData;
				},
				fnSave: (content) => {
					const outContent = img_raw_linear_8bpp.write(content, {
						width: 320,
						height: 200,
					});
					fnReplace(outContent.content.main);

					return {
						warnings: outContent.warnings,
					};
				},
			};
		});

		//
		// Inventory object images
		//
		let inventitem = {};
		const numInventoryItems = 254;

		for (let i = 1; i <= numInventoryItems; i += 1) {

			const paddedNum = i.toString().padStart(4, '0');
			const filename = `inv${paddedNum}.stp`;

			// Function to extract the raw image file.
			const fnExtract = () => getFileFromDat(this.datInvent, filename).getContent();

			// Function to overwrite the file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileFromDat(this.datInvent, filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			inventitem[`inventitem.${i}`] = {
				title: `Inventory item ${i}`,
				subtitle: filename,
				type: Game.ItemTypes.Image,
				fnExtract,
				fnReplace,

				// Function to open the file and return an Image instance.
				fnOpen: () => {
					const content = {
						main: fnExtract(),
					};

					let stpImg = Image_Stp_V2.read(content);
					stpImg.palette = gamePal;

					return stpImg;
				},
				fnSave: (content) => {
					const outContent = Image_Stp_V2.write(content);
					fnReplace(outContent.content.main);

					return {
						warnings: outContent.warnings,
					};
				},
			};
		}

		//
		// Miscellaneous overlay ("stamp") images; single-frame only
		//
		let stamp = {};
		attributesToItems(this.exe.attributes, 'filename.stamp.', (index, attr) => {
			const filename = attr.value;
			const titles = {
				'pscan': 'Planet scan display border',
				'navmap': 'Navigation starmap, galaxy background',
				'navbkgnd': 'Navigation starmap, sector background',
				'gtek': 'GameTek intro logo',
				'nomad': 'Nomad title logo',
				'design': 'Intense! Interactive intro logo',
				'papyrus': 'Papyrus Design Group intro logo',
				'border': 'Intro screen border',
				'guybody': 'Intro briefing guy',
				'sh01': 'Ship shield effect, frame A',
				'sh02': 'Ship shield effect, frame B',
			};

			// Names of STP images that use the GAME.PAL palette;
			// any STP files not in this list will use backg.pal.
			const gamePalImages = [
				'pscan',
				'navmap',
				'navbkgnd',
				'sh01',
				'sh02',
			];

			// Function to extract the raw image file.
			const fnExtract = () => getFileFromDat(this.datTest, filename).getContent();

			// Function to overwrite the file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileFromDat(this.datTest, filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			stamp[`stamp.${index}`] = {
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

					let stpImg = Image_Stp_V2.read(content);

					// Use GAME.PAL if the image requires it;
					// otherwise use backg.pal
					if (gamePalImages.includes(index)) {
						stpImg.palette = gamePal;

					} else {
						const palContent = {
							main: getFileFromDat(this.datTest, 'backg.pal').getContent()
						};
						const pal = pal_vga_6bit_papyrus.read(palContent);
						stpImg.palette = pal.palette;
					}

					return stpImg;
				},
				fnSave: (content) => {
					const outContent = Image_Stp_V2.write(content);
					fnReplace(outContent.content.main);

					return {
						warnings: outContent.warnings,
					};
				},
			};
		});

		//
		// Frames of an explosion effect (not stored as explicit filenames in the .exe)
		//
		const numExplosionFrames = 5;
		for (let i = 1; i <= numExplosionFrames; i += 1) {

			const paddedNum = i.toString().padStart(2, '0');
			const filename = `EX${paddedNum}.STP`;

			// Function to extract the raw image file.
			const fnExtract = () => getFileFromDat(this.datTest, filename).getContent();

			// Function to overwrite the file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileFromDat(this.datTest, filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			stamp[`stamp.ex${paddedNum}`] = {
				title: `Explosion effect, frame ${i}`,
				subtitle: filename,
				type: Game.ItemTypes.Image,
				fnExtract,
				fnReplace,

				// Function to open the file and return an Image instance.
				fnOpen: () => {
					const content = {
						main: fnExtract(),
					};

					let stpImg = Image_Stp_V2.read(content);
					stpImg.palette = gamePal;

					return stpImg;
				},
				fnSave: (content) => {
					const outContent = Image_Stp_V2.write(content);
					fnReplace(outContent.content.main);

					return {
						warnings: outContent.warnings,
					};
				},
			};
		}

		//
		// Background star types (not stored as explicit filenames in the .exe)
		//
		const numBgStarTypes = 12;
		for (let i = 1; i <= numBgStarTypes; i += 1) {

			const paddedNum = i.toString().padStart(4, '0');
			const filename = `STAR${paddedNum}.STP`;

			// Function to extract the raw image file.
			const fnExtract = () => getFileFromDat(this.datTest, filename).getContent();

			// Function to overwrite the file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileFromDat(this.datTest, filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			stamp[`stamp.star${paddedNum}`] = {
				title: `Background star, type ${i}`,
				subtitle: filename,
				type: Game.ItemTypes.Image,
				fnExtract,
				fnReplace,

				// Function to open the file and return an Image instance.
				fnOpen: () => {
					const content = {
						main: fnExtract(),
					};

					let stpImg = Image_Stp_V2.read(content);
					stpImg.palette = gamePal;

					return stpImg;
				},
				fnSave: (content) => {
					const outContent = Image_Stp_V2.write(content);
					fnReplace(outContent.content.main);

					return {
						warnings: outContent.warnings,
					};
				},
			};
		}

		//
		// Overlay animations ("stamp rolls"); multi-frame .ROL format only
		//
		let stamproll = {};
		attributesToItems(this.exe.attributes, 'filename.stamproll.', (index, attr) => {
			const filename = attr.value;
			const titles = {
				'shipst': 'Engineering subsystem icons',
				'shp': 'Ship scan schematics',
				'smk': 'Snow crash particles and smoke',
				'guyhead': 'Intro briefing guy head animation, front',
				'guyhead2': 'Intro briefing guy head animation, profile',
				'guyturn': 'Intro briefing guy body animation',
			};

			// Names of ROL images that use the GAME.PAL palette;
			// any ROL files not in this list will use backg.pal.
			const gamePalImages = [
				'shipst',
				'shp',
			];

			// Function to extract the raw image file.
			const fnExtract = () => getFileFromDat(this.datTest, filename).getContent();

			// Function to overwrite the file.
			const fnReplace = content => {
				// Replace getContent() with a function that returns the new content.
				let file = getFileFromDat(this.datTest, filename);
				file.getContent = () => content;
				file.nativeSize = content.length;
				file.diskSize = undefined; // don't know until written
			};

			stamproll[`stamproll.${index}`] = {
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

					let rolImg = Image_Rol_V2.read(content);

					// Use GAME.PAL if the image requires it;
					// otherwise use backg.pal
					if (gamePalImages.includes(index)) {
						rolImg.palette = gamePal;

					} else {
						const palContent = {
							main: getFileFromDat(this.datTest, 'backg.pal').getContent()
						};
						const pal = pal_vga_6bit_papyrus.read(palContent);
						rolImg.palette = pal.palette;
					}

					return rolImg;
				},
				fnSave: (content) => {
					const outContent = Image_Rol_V2.write(content);
					fnReplace(outContent.content.main);

					return {
						warnings: outContent.warnings,
					};
				},
			};
		});

		//
		// Alien animation cels
		//
		let alien = {};
		const numCelsPerAlienSpecies = {
			'al': 6,
			'ar': 42,
			'be': 56,
			'ch': 54,
			'ke': 14,
			'ko': 32,
			'mu': 55,
			'pa': 51,
			'ph': 49,
			'sh': 43,
			'ur': 41,
		};
		// The actual in-game animations cels are created through a combination of
		// a .DEL file and one of many palettes (.PAL). There is no "default" palette
		// for most of these animations, so we'll simply choose an arbitrary one.
		// Notes:
		//   Palette number 00 does not exist for most sets.
		//   Only the Altec Hocker and Kenelm animation sets have a single palette available;
		//     all other alien animation sets have multiple available palettes.
		const firstPalPerAlienSpecies = {
			'al': 'ALT0001.PAL',
			'ar': 'ARD20.PAL',
			'be': 'BEL03.PAL',
			'ch': 'CHA07.PAL',
			'ke': 'KEN.PAL',
			'ko': 'KOR02.PAL',
			'mu': 'MUS12.PAL',
			'pa': 'PAH00.PAL',
			'ph': 'PHE10.PAL',
			'sh': 'SHA04.PAL',
			'ur': 'URS00.PAL',
		};
		const speciesNames = {
			'al': 'Altec Hocker',
			'ar': 'Arden',
			'be': 'Bellicosian',
			'ch': 'Chanticleer',
			'ke': 'Kenelm',
			'ko': 'Korok',
			'mu': 'Musin',
			'pa': 'Pahrump',
			'ph': 'Phelonese',
			'sh': 'Shaasa',
			'ur': 'Ursor'
		};

		for (const [species, numCels] of Object.entries(numCelsPerAlienSpecies)) {

			const palFilename = firstPalPerAlienSpecies[species];
			for (let celIndex = 1; celIndex <= numCels; celIndex += 1) {

				const paddedNum = celIndex.toString().padStart(4, '0');
				const delFilename = `${species}${paddedNum}.del`;

				// Function to extract the raw image file.
				const fnExtract = () => getFileFromDat(this.datAnim, delFilename).getContent();

				// Function to overwrite the file.
				const fnReplace = content => {
					// Replace getContent() with a function that returns the new content.
					let file = getFileFromDat(this.datAnim, delFilename);
					file.getContent = () => content;
					file.nativeSize = content.length;
					file.diskSize = undefined; // don't know until written
				};

				const speciesId = `${speciesNames[species]}`.toLowerCase().replace(/\s+/g, '');

				alien[`alien.${speciesId}.${celIndex}`] = {
					title: `${speciesNames[species]}, cel ${celIndex}`,
					subtitle: delFilename,
					type: Game.ItemTypes.Image,
					fnExtract,
					fnReplace,

					// Function to open the file and return an Image instance.
					fnOpen: () => {
						const content = {
							main: fnExtract(),
						};

						// Some of the alien palettes are sparse (i.e. they only contain a subset of the
						// full 256 colors allowed by the video mode.) However, some of the animation cels
						// use colors outside the sparse palette, so these images therefore depend on the
						// colors that were previously loaded to the VGA by other game palettes. Replicate this
						// behavior here by starting with GAME.PAL and then overlaying the sparse alien pal.
						const sparsePalContent = {
							main: getFileFromDat(this.datAnim, palFilename).getContent()
						};
						const sparsePal = pal_vga_6bit_papyrus.read(sparsePalContent).palette;
						const fullPal = Object.assign([], paletteVGA256(), gamePal, sparsePal);

						let delImg = img_del.read(content);
						delImg.palette = fullPal;

						return delImg;
					},
					fnSave: (content) => {
						const outContent = img_del.write(content);
						fnReplace(outContent.content.main);

						return {
							warnings: outContent.warnings,
						};
					},
				};
			}
		}

		//
		// Textures for planet globes
		//
		let planet = {};
		const numPlanetTextures = 51;
		const skippedPlanetTextures = [21, 22, 23];

		for (let i = 0; i < numPlanetTextures; i += 1) {

			// if this texture index isn't one of the three that is unused
			if (!skippedPlanetTextures.includes(i)) {

				const paddedNum = i.toString().padStart(2, '0');
				const plnFilename = `WORLD${paddedNum}a.pln`;
				const palFilename = `WORLD${paddedNum}a.pal`;

				// Function to extract the raw image file.
				const fnExtract = () => getFileFromDat(this.datTest, plnFilename).getContent();

				// Function to overwrite the file.
				const fnReplace = content => {
					// Replace getContent() with a function that returns the new content.
					let file = getFileFromDat(this.datTest, plnFilename);
					file.getContent = () => content;
					file.nativeSize = content.length;
					file.diskSize = undefined; // don't know until written
				};

				planet[`planet.${i}`] = {
					title: `Planet texture ${i}`,
					subtitle: plnFilename,
					type: Game.ItemTypes.Image,
					fnExtract,
					fnReplace,

					// Function to open the file and return an Image instance.
					fnOpen: () => {
						const content = {
							main: fnExtract(),
						};

						let plnImg = img_pln.read(content);

						const sparsePalContent = {
							main: getFileFromDat(this.datTest, palFilename).getContent()
						};
						const sparsePal = pal_vga_6bit_papyrus.read(sparsePalContent).palette;
						const fullPal = Object.assign([], paletteVGA256(), gamePal, sparsePal);

						plnImg.palette = fullPal;
						return plnImg;
					},
					fnSave: (content) => {
						const outContent = img_pln.write(content);
						fnReplace(outContent.content.main);

						return {
							warnings: outContent.warnings,
						};
					},
				};
			}
		}

		return {
			'fullscreen': {
				title: 'Fullscreen cinematic backdrops',
				type: Game.ItemTypes.Folder,
				children: fullscreen,
			},
			'inventitem': {
				title: 'Inventory item images',
				type: Game.ItemTypes.Folder,
				children: inventitem,
			},
			'stamp': {
				title: 'Overlay (stamp) images',
				type: Game.ItemTypes.Folder,
				children: stamp,
			},
			'stamproll': {
				title: 'Animations (stamp rolls)',
				type: Game.ItemTypes.Folder,
				children: stamproll,
			},
			'alien': {
				title: 'Alien animations cels',
				type: Game.ItemTypes.Folder,
				children: alien,
			},
			'planet': {
				title: 'Planet surface textures',
				type: Game.ItemTypes.Folder,
				children: planet,
			},
		};
	}

	async save() {
		let files = {};
		let warnings = [];

		const newAnimDat = arc_dat_papyrus_v1.generate(this.datAnim);
		files[this.datAnimFilename.toLowerCase()] = newAnimDat.main;

		const newConverseDat = arc_dat_papyrus_v1.generate(this.datConverse);
		files[this.datConverseFilename.toLowerCase()] = newConverseDat.main;

		const newInventDat = arc_dat_papyrus_v1.generate(this.datInvent);
		files[this.datInventFilename.toLowerCase()] = newInventDat.main;

		const newSamplesDat = arc_dat_papyrus_v1.generate(this.datSamples);
		files[this.datSamplesFilename.toLowerCase()] = newSamplesDat.main;

		const newTestDat = arc_dat_papyrus_v1.generate(this.datTest);
		files[this.datTestFilename.toLowerCase()] = newTestDat.main;

		// Write out any changes to the .EXE file.
		const outputExe = exe_nomad.patch({ main: this.exeContent }, this.exe);
		files[exeFilename.toLowerCase()] = outputExe.main;

		return {
			files,
			warnings,
		};
	}
}
