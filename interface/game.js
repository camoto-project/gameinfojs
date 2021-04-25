/*
 * Base class for Game interface.
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

export default class Game
{
	/**
	 * Retrieve information about the game handler.
	 *
	 * This must be overridden by all game handlers.  It returns a structure
	 * detailed below.
	 *
	 * @return {object} metadata.
	 */
	static metadata() {
		return {
			/**
			 * @typedef {object} Metadata
			 *
			 * @property {string} id
			 *   A unique identifier for the format.
			 *
			 * @property {string} title
			 *   The user-friendly title for the format.
			 */
			id: 'unknown',
			title: 'Unknown format',
		};
	}

	/**
	 * See if the given path belongs to the game supported by this handler.
	 *
	 * This is used for game autodetection.
	 *
	 * @param {Filesystem} filesystem
	 *   The local filesystem folder to examine.
	 *
	 * @return {Boolean} true if the data is definitely in this format, false if
	 *   it is definitely not in this format, and undefined if the data could not
	 *   be positively identified but it's possible it is in this format.
	 */
	// eslint-disable-next-line no-unused-vars
	static async identify(filesystem) {
		return {
			valid: false,
			reason: 'identify() is unimplemented for this game.',
		};
	}

	/**
	 * Prepare to read a game from the given filesystem folder.
	 *
	 * @param {Filesystem} filesystem
	 *   Filesystem interface used for reading and writing game files.
	 */
	constructor(filesystem) {
		this.filesystem = filesystem;
	}

	/**
	 * Read the game files and return any errors.
	 *
	 * @return {Array<string>} Zero or more warnings as user-friendly strings.
	 */
	async open() {
		return [];
	}

	/**
	 * Get a list of items that can be viewed or edited.
	 *
	 * title: Name to display to user when selecting the item.
	 *
	 * subtitle: Less prominent name, usually used for underlying filename if
	 *   present.
	 *
	 * type: `Game.ItemTypes` option, used to show icon for the content type and
	 *   to control which type of editor is used to view the item.
	 *
	 * fnExtract: Optional function to extract the underlying file.
	 *
	 * fnReplace: Replace data extracted with fnExtract, mandatory if fnExtract
	 *   is supplied.
	 *
	 * fnOpen: Mandatory function to turn the item into an object instance the
	 *   editor can access.
	 *
	 * fnSave: Mandatory function to save the object instance back to the game
	 *   data.  Note that this does not update the game files until `Game.save()`
	 *   is called.
	 *
	 * disabled: `true` if the user is not permitted to open the item, `false` or
	 *   `undefined` if it can be opened.
	 */
	async items() {
		throw new Error('BUG: Descendent class has not implemented this function!');
	}

	/**
	 * Check to make sure there will be no issues during saving.
	 *
	 * This is to allow a UI to pop up warnings before the user attempts to save,
	 * so they can address any issues sooner rather than later.
	 */
	async preflight() {
		return [];
	}

	/**
	 * Re-generate all game data files ready for writing to the filesystem.
	 *
	 * @return Object with the following properties.
	 *   - `files` is a key/value array with the key as the filename and the value
	 *     as a Uint8Array with the content to write to that file.
	 *   - `warnings` is an array of strings to present to the user as a list of
	 *     potential issues or problems encountered while applying the changes,
	 *     such as incompatible image palettes or saved-game filename extensions
	 *     not being changed and conflicting with the original game.
	 */
	async save() {
		throw new Error('BUG: Descendent class has not implemented this function!');
	}
}

// Standard item types used for building the tree of editable game items.  These
// roughly translate to one type per editor.
Game.ItemTypes = {
	Folder: 'folder',
	Attributes: 'attributes',
	B800: 'b800',
	Image: 'image',
	Map: 'map',
	Music: 'music',
	Sound: 'sound',
	Tileset: 'tileset',
};

Game.Severity = {
	Critical: 'CRI',
	Important: 'IMP',
	Informational: 'INF',
};
