/*
 * Test helper functions.
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

import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
	Filesystem,
} from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function hexdump(d) {
	let s = '', h = '', t = '';
	function addRow(i) {
		s += (i - 15).toString(16).padStart(6, '0') + '  ' + h + '  ' + t + '\n';
		h = t = '';
	}
	let i;
	for (i = 0; i < (d && d.length || 0); i++) {
		const v = d[i];
		h += v.toString(16).padStart(2, '0') + ' ';
		t += ((v < 32) || (v > 126)) ? '.' : String.fromCharCode(v);
		if (i % 16 === 15) {
			addRow(i);
		}
	}
	if (i % 16) {
		// Need to pad out the final row
		const end = d.length + 16 - (d.length % 16);
		for (; i < end; i++) {
			h += '   ';
		}
		addRow(i-1);
	}
	return s;
}

function arrayEqual(a, b) {
	if (!a || !b) return false;
	if (a.length != b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] != b[i]) return false;
	}
	return true;
}

export default class TestUtil {
	constructor(idHandler) {
		assert.ok(idHandler, 'Format handler ID must be specified');
		this.idHandler = idHandler;

		this.fs = null;
		const pathFiles = path.resolve(__dirname, this.idHandler);
		if (fs.existsSync(pathFiles)) {
			this.fs = new Filesystem(pathFiles);
		}
	}

	getFilesystem() {
		return this.fs;
	}

	static buffersEqual(expected, actual, msg) {
		const errorFilename = expected.filename && path.resolve(__dirname, expected.filename);

		if (expected instanceof ArrayBuffer) {
			expected = new Uint8Array(expected);
		}
		if (!arrayEqual(expected, actual)) {
			if (process.env.SAVE_FAILED_TEST == 1) {
				if (errorFilename) {
					let fn = errorFilename + '.failed_test_output';
					// eslint-disable-next-line no-console
					console.warn(`** Saving actual data to ${fn}`);
					fs.writeFileSync(fn, actual);
				} else {
					// eslint-disable-next-line no-console
					console.warn(`** Not saving failed test data as this data didn't come from a file`);
				}
			}

			throw new assert.AssertionError({
				message: 'Buffers are not equal' + (msg ? ': ' + msg : ''),
				expected: hexdump(expected),
				actual: hexdump(actual),
			});
		}
	}

	static contentEqual(contentExpected, contentActual) {
		for (const id of Object.keys(contentExpected)) {
			this.buffersEqual(contentExpected[id], contentActual[id], `supp "${id}"`);
		}
	}

	static u8FromString(s) {
		return Uint8Array.from(s.split(''), s => s.charCodeAt(0));
	}

	static hash(content) {
		return crypto
			.createHash('sha1')
			.update(content)
			.digest('base64');
	}

	async checkExpectedFiles(expectedHashes) {
		let actualData = {};
		for (const filename of Object.keys(expectedHashes)) {
			actualData[filename] = await this.fs.read(filename);
		}
		return this.checkFileHash(
			actualData,
			expectedHashes,
			'Incorrect version of test file, please supply the correct version'
		);
	}

	// Check a collection of binary arrays match the expected hash.
	checkFileHash(actualData, expectedHashes, msg) {
		let actualHashes = {};

		// Create dummy entries for all expected files.
		for (const filename of Object.keys(expectedHashes)) {
			actualHashes[filename] = '(file missing)';
		}

		// Hash the received data, overwriting hopefully all the above values.
		for (const [ filename, content ] of Object.entries(actualData)) {
			actualHashes[filename] = TestUtil.hash(content);
		}

		for (const [ filename, actualHash ] of Object.entries(actualHashes)) {
			assert.equal(
				actualHash,
				expectedHashes[filename] || '',
				`${msg}: ${filename}`
			);
		}
	}
}
