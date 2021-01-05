/*
 * Command line interface to the library.
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

import commandLineArgs from 'command-line-args';
import Debug from '../util/debug.js';
const debug = Debug.extend('cli');
import {
	Filesystem,
	Game,
	all as gameinfoFormats,
	findHandler as gameinfoFindHandler,
} from '../index.js';

class OperationsError extends Error {
}

class Operations
{
	constructor() {
	}

	async check() {
		const result = await this.game.preflight();
		if (result.length === 0) {
			console.log('No problems detected.');
			return true;
		}

		let minor = true;
		for (const warning of result) {
			console.log(`== [${warning.severity}] ${warning.summary} ==\n`);
			console.log(warning.detail);
			console.log();

			if (
				minor
				&& [
					Game.Severity.Critical,
					Game.Severity.Important,
				].includes(warning.severity)
			) {
				minor = false;
			}
		}
		return minor;
	}

	async list() {
		// Get this each time otherwise we won't see updates after other changes.
		const gameItems = await this.game.items();

		function show(depth, items) {
			for (const i of Object.keys(items)) {
				const item = items[i];
				let subtitle = item.subtitle ? ` [${item.subtitle}]` : '';
				console.log('  '.repeat(depth) + `* ${i} [${item.type}]: ${item.title}${subtitle}`);
				if (item.type === Game.ItemTypes.Folder) {
					show(depth + 1, item.children);
				}
			}
		}
		show(0, gameItems);
	}

	async open(params) {
		let handler;
		if (params.format) {
			handler = gameinfoFormats.find(h => h.metadata().id === params.format);
			if (!handler) {
				throw new OperationsError('Invalid format code: ' + params.format);
			}
		}
		if (!params.target) {
			throw new OperationsError('open: missing path');
		}

		let gameFolder = new Filesystem(params.target);
		if (!handler) {
			let handlers = gameinfoFindHandler(gameFolder);
			if (handlers.length === 0) {
				throw new OperationsError('Unable to identify this game.');
			}
			if (handlers.length > 1) {
				console.error('This game could not be unambiguously identified.  It could be:');
				handlers.forEach(h => {
					const m = h.metadata();
					console.error(` * ${m.id} (${m.title})`);
				});
				throw new OperationsError('open: please use the -f option to specify the format.');
			}
			handler = handlers[0];
		}

		this.game = new handler(gameFolder);
		const warnings = await this.game.open();
		if (warnings.length) {
			console.error('There were warnings opening this game:');
			for (const warning of warnings) {
				console.error(` * ${warning}`);
			}
		}
	}

	async rename(params) {
		const gameItems = await this.game.items();
		const item = this.findItem(params.target, gameItems);
		if (!item) {
			throw new OperationsError(`Unable to find item "${params.target}".`);
		}
		if (!item.fnRename) {
			throw new OperationsError(`The item "${params.target}" does not support being renamed.`);
		}
		try {
			await item.fnRename(params.new);
		} catch (e) {
			debug(e);
			throw new OperationsError(`Rename failed: ${e.message}`);
		}
	}

	async save(params) {
		if (!params.force) {
			const r = await this.check();
			if (!r) {
				throw new OperationsError('Save failed: fix the warnings and try again.');
			}
		}
		try {
			await this.game.save();
		} catch (e) {
			debug(e);
			throw new OperationsError(`Save failed: ${e.message}`);
		}
	}

	findItem(id, root) {
		for (const i of Object.keys(root)) {
			const item = root[i];
			if (i === id) return item;
			if (item.type === Game.ItemTypes.Folder) {
				const c = this.findItem(id, item.children);
				if (c) return c;
			}
		}

		return null;
	}
}

Operations.names = {
	check: [],
	list: [],
	open: [
		{ name: 'format', alias: 'f' },
		{ name: 'target', defaultOption: true },
	],
	rename: [
		{ name: 'new', alias: 'n' },
		{ name: 'target', defaultOption: true },
	],
	save: [
		{ name: 'force', alias: 'f', type: Boolean },
	],
};

// Make some alises
const aliases = {
	list: ['dir', 'ls'],
};
Object.keys(aliases).forEach(cmd => {
	aliases[cmd].forEach(alias => {
		Operations.names[alias] = Operations.names[cmd];
		Operations.prototype[alias] = Operations.prototype[cmd];
	});
});

function listFormats()
{
	for (const handler of gameinfoFormats) {
		const md = handler.metadata();
		console.log(`${md.id}: ${md.title}`);
		if (md.params) Object.keys(md.params).forEach(p => {
			console.log(`  * ${p}: ${md.params[p]}`);
		});
	}
}

async function processCommands()
{
	let cmdDefinitions = [
		{ name: 'help', type: Boolean },
		{ name: 'formats', type: Boolean },
		{ name: 'name', defaultOption: true },
	];
	let argv = process.argv;

	let cmd = commandLineArgs(cmdDefinitions, { argv, stopAtFirstUnknown: true });
	argv = cmd._unknown || [];

	if (cmd.formats) {
		listFormats();
		return;
	}

	if (!cmd.name || cmd.help) {
		// No params, show help.
		console.log(`Use: gameinfo --formats | [command1 [command2...]]

Options:

  --formats
    List all supported games.

Commands:

  check
    Run preflight checks before saving to pick up any potential problems.
    These are run automatically during a save operation, but this allows them
    to be run without saving anything in the event that there are no problems.

  list | ls | dir
    Show all items in the currently opened game.

  open [-f format] <folder>
    Open the local <folder> as a game, autodetecting the game unless -f is
    given.  Use --formats for a list of possible values.

  save [-f]
    Write any changes back to the game files.  This will fail if there are
    important or critical warnings, but -f will ignore the warnings and force
    a save anyway.

Examples:

  # List elements in a game stored in the folder /dos/games/cosmo.
  gameinfo open /dos/games/cosmo list

  # Rename the file used by the 'music.filename.1' element in the above list,
  # which in this case renames it inside the game's .VOL archive file, as well
  # as updating the filename inside the game's .EXE file so the game continues
  # to run normally with the new filename.  Beware this modifies the files in
  # the game directory!
  gameinfo open /dos/games/cosmo rename -n mysong.mni music.filename.1 save

  # The DEBUG environment variable can be used for troubleshooting.
  DEBUG='game*' gameinfo ...
`);
		return;
	}

	let proc = new Operations();
	//	while (argv.length > 2) {
	while (cmd.name) {
		const def = Operations.names[cmd.name];
		if (def) {
			const runOptions = commandLineArgs(def, { argv, stopAtFirstUnknown: true });
			argv = runOptions._unknown || [];
			try {
				await proc[cmd.name](runOptions);
			} catch (e) {
				if (e instanceof OperationsError) {
					console.error(e.message);
					process.exit(2);
				}
				throw e;
			}
		} else {
			console.error(`Unknown command: ${cmd.name}`);
			process.exit(1);
		}
		cmd = commandLineArgs(cmdDefinitions, { argv, stopAtFirstUnknown: true });
		argv = cmd._unknown || [];
	}
}

export default processCommands;
