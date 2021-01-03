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

export * from './games/index.js';

export { default as Filesystem } from './interface/filesystem.js';
export { default as Game } from './interface/game.js';
import * as games from './games/index.js';

import Debug from './util/debug.js';
const debug = Debug.extend('index');

/**
 * Get a list of all the available handlers.
 *
 * This is preferable to `import *` because most libraries also export utility
 * functions like the autodetection routine which would be included even though
 * they are not format handlers.
 */
export const all = [
	...Object.values(games),
];

/**
 * Get a handler by examining the game folder.
 *
 * @param {Filesystem} filesystem
 *   Path to game folder.
 *
 * @return {Array<Game>} from games/*.js that can handle the game, or an
 *   empty array if the format could not be identified.
 *
 * @example
 * import {
 *   findHandler as gameinfoFindHandler,
 *   Filesystem,
 * } from '@camoto/gameinfo';
 *
 * const gameFolder = new Filesystem('/dos/games/cosmo');
 * const handler = gameinfoFindHandler(gameFolder);
 *
 * if (handler.length === 0) {
 *   console.log('Unable to identify game.');
 * } else {
 *   const md = handler[0].metadata();
 *   console.log('Game is in ' + md.id + ' format');
 * }
 */
export function findHandler(filesystem) {
	let handlers = [];
	for (const x of all) {
		const metadata = x.metadata();
		debug(`Trying format handler ${metadata.id} (${metadata.title})`);
		const confidence = x.identify(filesystem);
		if (confidence.valid === true) {
			debug(`Matched ${metadata.id}: ${confidence.reason}`);
			handlers = [x];
			break;
		} else if (confidence.valid === undefined) {
			debug(`Possible match for ${metadata.id}: ${confidence.reason}`);
			handlers.push(x);
			// keep going to look for a better match
		} else {
			debug(`Not ${metadata.id}: ${confidence.reason}`);
		}
	}
	return handlers;
};
