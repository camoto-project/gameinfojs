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

import chalk from 'chalk';
import commandLineArgs from 'command-line-args';
import fs from 'fs';
import path from 'path';
import {
	Image,
	all as gamegraphicsFormats,
	findHandler as gamegraphicsFindHandler,
} from '@camoto/gamegraphics';
import {
	Music,
	Patch,
	all as gamemusicFormats,
} from '@camoto/gamemusic';
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

// Open a file via gamegraphicsjs and return an Image/Palette instance.
function gamegraphicsOpen(target, format)
{
	let handler;
	if (format) {
		handler = gamegraphicsFormats.find(h => h.metadata().id === format);
		if (!handler) {
			throw new OperationsError(`Invalid gamegraphicsjs format code: ${format}.`);
		}
	}

	let content = {
		main: fs.readFileSync(target),
	};
	if (!handler) {
		let handlers = gamegraphicsFindHandler(content.main, target);
		if (handlers.length === 0) {
			throw new Error('unable to identify this file format.');
		}
		if (handlers.length > 1) {
			console.error('This file format could not be unambiguously identified.  It could be:');
			handlers.forEach(h => {
				const m = h.metadata();
				console.error(` * ${m.id} (${m.title})`);
			});
			throw new Error('please use the -t option to specify the format.');
		}
		handler = handlers[0];
	}

	const suppList = handler.supps(target, content.main);
	if (suppList) {
		for (const [id, suppFilename] of Object.entries(suppList)) {
			debug(`Reading supp "${id}" from: ${suppFilename}`);
			try {
				content[id] = fs.readFileSync(suppFilename);
				content[id].filename = suppFilename;
			} catch (e) {
				throw new Error(`unable to open supplementary file `
					+ `"${suppFilename}": ${e.message}`);
			}
		}
	}

	const options = {};
	return handler.read(content, options);
}

class Operations
{
	constructor() {
		this.gamePath = null;
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

	async export(params) {
		if (!this.item) {
			throw new OperationsError(`export: must 'select' an item first.`);
		}
		if (!this.item.fnOpen) {
			throw new OperationsError(`export: this item does not support being opened.`);
		}
		if (!params.format) {
			throw new OperationsError(`export: must specify an output format with -t.`);
		}
		if (!params.target) {
			throw new OperationsError(`export: must specify an output filename.`);
		}
		let doc;
		try {
			doc = this.item.fnOpen();
		} catch (e) {
			debug(e);
			throw new OperationsError(`export: error opening item - ${e.message}`);
		}
		if (doc instanceof Music) {
			const handler = gamemusicFormats.find(h => h.metadata().id === params.format);
			if (!handler) {
				throw new OperationsError(`export: invalid music format '${params.format}'.`);
			}

			const problems = handler.checkLimits(doc);
			if (problems.length) {
				console.log('There are problems preventing the file from being saved:\n');
				for (let i = 0; i < problems.length; i++) {
					console.log((i + 1).toString().padStart(2) + ': ' + problems[i]);
				}
				console.log('\nPlease correct these issues and try again.\n');
				throw new OperationsError(`export: unable to export as `
					+ `'${params.format}' due to file format limitations.`);
			}

			let content, warnings;
			try {
				({ content, warnings } = handler.generate(doc));
			} catch (e) {
				debug(e);
				throw new OperationsError(`export: MusicHandler.generate() failed - ${e.message}`);
			}

			let promises = [];
			const suppList = handler.supps(params.target, content.main);
			if (suppList) Object.keys(suppList).forEach(id => {
				console.warn(' - Saving supplemental file', suppList[id]);
				promises.push(
					fs.promises.writeFile(suppList[id], content[id])
				);
			});
			promises.push(fs.promises.writeFile(params.target, content.main));

			if (warnings.length) {
				console.log('There were warnings generated while saving:\n');
				for (let i in warnings) {
					console.log(((i >>> 0) + 1).toString().padStart(2) + '. ' + warnings[i]);
				}
			}

			await Promise.all(promises);

		} else if ((doc instanceof Image) || (doc[0] instanceof Image)) {
			const handler = gamegraphicsFormats.find(h => h.metadata().id === params.format);
			if (!handler) {
				throw new OperationsError(`export: invalid graphics format '${params.format}'.`);
			}

			const problems = handler.checkLimits(doc);
			if (problems.length) {
				console.log('There are problems preventing the file from being saved:\n');
				for (let i = 0; i < problems.length; i++) {
					console.log((i + 1).toString().padStart(2) + ': ' + problems[i]);
				}
				console.log('\nPlease correct these issues and try again.\n');
				throw new OperationsError(`export: unable to export as `
					+ `'${params.format}' due to file format limitations.`);
			}

			let content, warnings;
			try {
				({ content, warnings } = handler.write(doc));
			} catch (e) {
				debug(e);
				throw new OperationsError(`export: ImageHandler.generate() failed - ${e.message}`);
			}

			let promises = [];
			const suppList = handler.supps(params.target, content.main);
			if (suppList) Object.keys(suppList).forEach(id => {
				console.warn(' - Saving supplemental file', suppList[id]);
				promises.push(
					fs.promises.writeFile(suppList[id], content[id])
				);
			});
			promises.push(fs.promises.writeFile(params.target, content.main));

			if (warnings.length) {
				console.log('There were warnings generated while saving:\n');
				for (let i in warnings) {
					console.log(((i >>> 0) + 1).toString().padStart(2) + '. ' + warnings[i]);
				}
			}

			await Promise.all(promises);

		} else {
			throw new OperationsError(`export: cannot export this document type.`);
		}
	}

	async extract(params) {
		if (!this.item) {
			throw new OperationsError(`extract: must 'select' an item first.`);
		}
		if (!this.item.fnExtract) {
			throw new OperationsError(`extract: this item does not support being extracted.`);
		}
		if (!params.target) {
			throw new OperationsError(`extract: must specify an output filename.`);
		}

		const content = this.item.fnExtract();
		await fs.promises.writeFile(params.target, content);
	}

	async import(params) {
		if (!this.item) {
			throw new OperationsError(`import: must 'select' an item first.`);
		}
		if (!this.item.fnSave) {
			throw new OperationsError(`import: this item does not support being saved.`);
		}
		if (!params.target) {
			throw new OperationsError(`import: must specify an input filename.`);
		}

		let result;
		switch (this.item.type) {
			case Game.ItemTypes.Image: // gamegraphics Image
				result = this.item.fnSave(
					gamegraphicsOpen(params.target, params.format)
				);
				break;
			default:
				throw new OperationsError(`import: importing items of type `
					+ `"${this.item.type}" is not yet supported.`);
		}

		if (result.warnings.length) {
			console.log('There were warnings generated while saving:\n');
			for (let i in result.warnings) {
				console.log(((i >>> 0) + 1).toString().padStart(2) + '. '
					+ result.warnings[i]);
			}
		}
	}

	async info() {
		if (!this.item) {
			throw new OperationsError(`info: must 'select' an item first.`);
		}
		if (!this.item.fnOpen) {
			throw new OperationsError(`info: this item does not support being opened.`);
		}
		let doc;
		try {
			doc = this.item.fnOpen();
		} catch (e) {
			debug(e);
			throw new OperationsError(`info: error opening item - ${e.message}`);
		}

		process.stdout.write(`Object class: ${doc.constructor.name}\n`);
		switch (this.item.type) {
			case 'music': {
				process.stdout.write(`Document type: Music\n`);
				process.stdout.write(`Number of tracks: ${doc.trackConfig.length}\n`);
				const instCount = {
					MIDI: doc.patches.filter(p => p instanceof Patch.MIDI).length,
					OPL: doc.patches.filter(p => p instanceof Patch.OPL).length,
					PCM: doc.patches.filter(p => p instanceof Patch.PCM).length,
				};
				process.stdout.write(`Number of instruments:`);
				for (const [ type, count ] of Object.entries(instCount)) {
					process.stdout.write(chalk` ${type}:{greenBright ${count}}`);
				}
				process.stdout.write('\n');
				break;
			}

			case 'image': {
				function imgInfo(img) {
					process.stdout.write(`Document type: Image\n`);
					process.stdout.write(`Dimensions: ${img.width} x ${img.height}\n`);

					process.stdout.write(`Palette size: `);
					if (img.palette) {
						process.stdout.write(img.palette.length.toString());
					} else {
						process.stdout.write(`N/A`);
					}
					process.stdout.write(`\n`);

					process.stdout.write(`Hotspot: `);
					if (img.hotspot && (img.hotspot.x !== undefined)) {
						process.stdout.write(`(${img.hotspot.x}, ${img.hotspot.y})`);
					} else {
						process.stdout.write(`None`);
					}
					process.stdout.write(`\n`);

					process.stdout.write(`Number of frames: ${img.frames.length}\n`);
					for (let f = 0; f < img.frames.length; f++) {
						const fr = img.frames[f];
						process.stdout.write(`  ${f}: ${fr.width}x${fr.height}\n`);
					}
				}
				if (doc.length > 0) {
					// Array of images.
					for (let i = 0; i < doc.length; i++) {
						process.stdout.write(`\n* Image ${i}:\n`);
						imgInfo(doc[i]);
					}
				} else {
					// Single image.
					imgInfo(doc);
				}
				break;
			}

			default:
				process.stdout.write(`Document type: Unknown (${this.item.type})\n`);
				break;
		}
	}

	async list() {
		// Get this each time otherwise we won't see updates after other changes.
		const gameItems = await this.game.items();

		if (!gameItems) {
			console.log('No items found!');
			return;
		}

		function show(depth, items) {
			for (const i of Object.keys(items)) {
				const item = items[i];
				let subtitle = item.subtitle ? chalk` | {blueBright ${item.subtitle}}` : '';
				const disabled = item.disabled ? chalk` {redBright DISABLED}` : '';
				console.log('  '.repeat(depth) + chalk`* [{whiteBright ${i}}]: {yellowBright ${item.title}}${subtitle} {grey (${item.type})}${disabled}`);
				if (item.type === Game.ItemTypes.Folder) {
					if (!item.children) {
						console.error('  '.repeat(depth) + chalk`! ERROR: item.children is missing!`);
						continue;
					}
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

		this.gamePath = params.target;
		let gameFolder = new Filesystem(this.gamePath);
		if (!handler) {
			let handlers = await gameinfoFindHandler(gameFolder);
			if (handlers.length === 0) {
				throw new OperationsError('Unable to identify this game.');
			}
			if (handlers.length > 1) {
				console.error('This game could not be unambiguously identified.  It could be:');
				handlers.forEach(h => {
					const m = h.metadata();
					console.error(` * ${m.id} (${m.title})`);
				});
				throw new OperationsError('open: please use the -t option to specify the format.');
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
		if (!this.item) {
			throw new OperationsError(`rename: must 'select' an item first.`);
		}
		if (!params.target) {
			throw new OperationsError(`rename: must specify new name.`);
		}
		if (!this.item.fnRename) {
			throw new OperationsError(`rename: the selected item does not support being renamed.`);
		}
		try {
			await this.item.fnRename(params.target);
		} catch (e) {
			debug(e);
			throw new OperationsError(`rename: ${e.message}`);
		}
	}

	async replace(params) {
		if (!this.item) {
			throw new OperationsError(`replace: must 'select' an item first.`);
		}
		if (!this.item.fnExtract) {
			throw new OperationsError(`replace: this item does not support being replaced.`);
		}
		if (!params.target) {
			throw new OperationsError(`replace: must specify a filename to read.`);
		}

		let content;
		try {
			content = await fs.promises.readFile(params.target);
		} catch (e) {
			throw new OperationsError(`replace: error reading source file - ${e.message}`);
		}
		try {
			this.item.fnReplace(content);
		} catch (e) {
			throw new OperationsError(`replace: error performing replacement - ${e.message}`);
		}
	}

	async save(params) {
		if (!params.force) {
			const r = await this.check();
			if (!r) {
				throw new OperationsError('save: fix the warnings and try again.');
			}
		}

		let output;
		try {
			output = await this.game.save();
		} catch (e) {
			debug(e);
			throw new OperationsError(`save: ${e.message}`);
		}

		const { files, warnings } = output;

		if (warnings.length) {
			console.error('There were warnings saving this game:');
			for (const warning of warnings) {
				console.error(` * ${warning}`);
			}
		}

		let promises = [];
		for (const [ filename, content ] of Object.entries(files)) {
			const targetFilename = path.join(this.gamePath, filename.toLowerCase());
			console.log(`Writing ${targetFilename}`);
			promises.push(
				fs.promises.writeFile(targetFilename, content)
			);
		}

		return await Promise.all(promises);
	}

	async select(params) {
		const gameItems = await this.game.items();
		this.item = this.findItem(params.target, gameItems);
		if (!this.item) {
			throw new OperationsError(`select: unable to find item "${params.target}".`);
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
	export: [
		{ name: 'format', alias: 't' },
		{ name: 'target', defaultOption: true },
	],
	extract: [
		{ name: 'target', defaultOption: true },
	],
	import: [
		{ name: 'format', alias: 't' },
		{ name: 'target', defaultOption: true },
	],
	info: [],
	list: [],
	open: [
		{ name: 'format', alias: 't' },
		{ name: 'target', defaultOption: true },
	],
	rename: [
		{ name: 'target', defaultOption: true },
	],
	replace: [
		{ name: 'target', defaultOption: true },
	],
	save: [
		{ name: 'force', alias: 'f', type: Boolean },
	],
	select: [
		{ name: 'target', defaultOption: true },
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

  open [-t format] <folder>
    Open the local <folder> as a game, autodetecting the game unless -t is
    given.  Use --formats for a list of possible values.

  save [-f]
    Write any changes back to the game files.  This will fail if there are
    important or critical warnings, but -f will ignore the warnings and force
    a save anyway.

  select <id>
    Select an item by ID for the selection commands below to work on.

Selection commands:

  These commands work on the item previously chosen with the 'select' command.

  export -t format <file>
    Export (convert) the selected item to a file in the given format.  Not all
    items can be exported in this manner, but many can.  Counterpart to
    'import'.

  extract <file>
    Copy the selected item into <file> in the current directory, without
    changing or converting it, apart from decompressing or decrypting it if the
    game had done so.  Not all items can be extracted, typically only those
    items that translate to a single underlying file.  Counterpart to 'replace'.

  import [-t format] <file>
    Open <file> as the given format (or try to autodetect if omitted) and
    convert the file into the game's native format, overwriting the last
    selected item.  Unlike 'replace' which only handles raw data, 'import' will
    read any supported format and convert it if possible to the required
    format.  Not all items can be replaced by importing, and of those that can,
    not all formats can be converted automatically.  Counterpart to 'export'.

  info
    Display technical information about the selected item.

  rename <new>
    Rename any underlying file to <new>.  If supported, this renames the file
    everywhere, including inside any archive and where it is referenced in the
    game executable, so the game will usually work unchanged after this
    operation.

  replace <file>
    Open <file> from the current directory and use it to overwrite the selected
    item.  No format conversions are performed, although the content may be
    compressed or encrypted if the underlying game requires it.  As with the
    counterpart 'extract', not everything can be replaced.

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
					console.error(chalk.redBright(e.message));
					process.exit(2);
				}
				throw e;
			}
		} else {
			console.error(chalk`{redBright Unknown command:} ${cmd.name}`);
			process.exit(1);
		}
		cmd = commandLineArgs(cmdDefinitions, { argv, stopAtFirstUnknown: true });
		argv = cmd._unknown || [];
	}
}

export default processCommands;
