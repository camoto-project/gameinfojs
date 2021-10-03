/*
 * Information about Captain Comic.
 *
 * This game is documented on the ModdingWiki:
 *   http://www.shikadi.net/moddingwiki/Captain_Comic
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

const FORMAT_ID = 'game-ccomic';

import Debug from '../../util/debug.js';
const debug = Debug.extend(FORMAT_ID);

import { cmp_rle_ccomic } from '@camoto/gamecomp';
import {
	img_raw_planar_4bpp,
} from '@camoto/gamegraphics';

import Game from '../../interface/game.js';

export default class Game_CComic extends Game
{
	static metadata() {
		let md = {
			...super.metadata(),
			id: FORMAT_ID,
			title: 'Captain Comic',
		};

		return md;
	}

	static async identify(filesystem) {
		const exeFilename = 'comic.exe';
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

		let files = [
			'comic.exe',
		];

		for (let i = 0; i < 5; i++) {
			const filename = `sys${i.toString(10).padStart(3, '0')}.ega`;
			files.push(filename);
		}

		this.content = {};
		for (const filename of files) {
			try {
				this.content[filename] = await this.filesystem.read(filename);
			} catch (e) {
				warnings.push(
					`Unable to open ${filename}: ${e.message}`
				);
			}
		}

		return warnings;
	}

	async items() {
		let gfx = {};

		for (let i = 0; i < 5; i++) {
			const filename = `sys${i.toString(10).padStart(3, '0')}.ega`;
			let item = {
				title: `Splash screen ${i}`,
				subtitle: filename,
				type: Game.ItemTypes.Image,
				fnExtract: () => {
					return cmp_rle_ccomic.reveal(this.content[filename]);
				},
				fnReplace: newContent => {
					this.content[filename] = cmp_rle_ccomic.obscure(newContent);
				},
				fnOpen: () => {
					return img_raw_planar_4bpp.read({
						main: item.fnExtract(),
					}, {
						width: 320,
						height: 200,
						planeCount: 4,
					});
				},
			};
			gfx[`splash.${i}`] = item;
		}

		return {
			'graphics': {
				title: 'Graphics',
				type: Game.ItemTypes.Folder,
				children: gfx,
			},
		};
	}

	async preflight() {
		let warnings = [];

		return warnings;
	}

	async save() {
		let warnings = [];

		return {
			files: this.content,
			warnings,
		};
	}
}
