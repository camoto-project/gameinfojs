/*
 * Generic filesystem interface.
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

import fs from 'fs';
import path from 'path';
import Debug from '../util/debug.js';
const debug = Debug.extend('filesystem');

export default class Filesystem
{
	constructor(rootPath) {
		this.rootPath = rootPath;
	}

	async findFile(filename) {
		debug(`Searching for ${this.rootPath}${filename}`);
		const elements = filename.split(path.sep);
		let nextPath = this.rootPath;
		for (const el of elements) {
			const targetEl = el.toUpperCase();
			const dir = await fs.promises.opendir(nextPath);
			let found = false;
			for await (const dirent of dir) {
				if (dirent.name.toUpperCase() == targetEl) {
					nextPath = path.join(nextPath, dirent.name);
					found = true;
					break;
				}
			}
			if (!found) {
				debug(`File not found: "${filename}" (could not find "${el}" inside `
					+ `folder "${nextPath}").`);
				return null;
			}
		}
		debug(`Found ${nextPath}`);

		return nextPath;
	}

	async read(filename) {
		const localFile = await this.findFile(filename);
		if (localFile === null) throw new Error(`${filename} could not be read.`);
		const content = await fs.promises.readFile(localFile);

		return content;
	}

	async rename(newName, oldName) {
		debug(`Renaming ${oldName} to ${newName}`);
		return await fs.promises.rename(oldName, newName);
	}
}
