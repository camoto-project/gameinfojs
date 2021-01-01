/*
 * Main library interface.
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

import Debug from './util/debug.js';
const debug = Debug.extend('index');

import Game from './interface/game.js';
import Game_Cosmo from './games/game-cosmo.js';

const fileTypes = [
	Game_Cosmo,
];

/**
 * Main library interface.
 */
export default class GameInfo
{
	/**
	 * Get a handler by ID directly.
	 *
	 * @param {string} type
	 *   Identifier of desired file format.
	 *
	 * @return {CodeHandler} from formats/*.js matching requested code, or null
	 *   if the code is invalid.
	 *
	 * @example const handler = GameCode.getHandler('exe-cosmo1');
	 */
	static getHandler(type)
	{
		return fileTypes.find(x => type === x.metadata().id);
	}

	/**
	 * Get a handler by examining the contents of a folder.
	 *
	 * @param {Filesystem} filesystem
	 *   Path to game folder.
	 *
	 * @return {Array<Game>} from games/*.js that can handle the game, or an
	 *   empty array if the format could not be identified.
	 *
	 * @example
	 * const handler = GameCode.findHandler('/dos/games/cosmo');
	 * if (!handler) {
	 *   console.log('Unable to identify game.');
	 * } else {
	 *   const md = handler.metadata();
	 *   console.log('Game is ' + md.id);
	 * }
	 */
	static async findHandler(filesystem)
	{
		let handlers = [];
		for (const x of fileTypes) {
			const metadata = x.metadata();
			debug(`Trying format handler ${metadata.id} (${metadata.title})`);
			const confidence = await x.identify(filesystem);
			if (confidence.valid === true) {
				handlers = [x];
				break;
			}
			if (confidence.valid === undefined) {
				handlers.push(x);
				// keep going to look for a better match
			}
			debug(` - Handler reported: ${confidence.reason}`);
		}

		return handlers;
	}

	/**
	 * Get a list of all the available handlers.
	 *
	 * This is probably only useful when testing the library.
	 *
	 * @return {Array} of file format handlers, with each element being just like
	 *   the return value of getHandler().
	 */
	static listHandlers() {
		return fileTypes;
	}
};

GameInfo.Game = Game;
