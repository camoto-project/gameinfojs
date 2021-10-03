/*
 * Standard tests.
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
import TestUtil from './util.js';

import {
	all as allGames,
} from '../index.js';

for (const handler of allGames) {
	const md = handler.metadata();
	let testutil = new TestUtil(md.id);

	describe(`Standard tests for ${md.title} [${md.id}]`, function() {
		const fs = testutil.getFilesystem();

		describe('metadata()', function() {

			it('should provide a title', function() {
				assert.ok(md.title && (md.title.length > 0));
			});

		}); // metadata() tests

		describe('identify()', function() {

			it('should identify the real game files (if present)', async function() {
				// Skip tests if the game files are not present.
				if (!fs) this.skip();

				const result = await handler.identify(fs);
				assert.equal(result.valid, true);
			});

			for (const handler2 of allGames) {
				if (handler2 === handler) continue;

				const md2 = handler2.metadata();
				let testutil2 = new TestUtil(md2.id);

				it(`should not identify ${md2.title} files`, async function() {
					const fs2 = testutil2.getFilesystem();

					// Skip tests if the game files are not present.
					if (!fs2) this.skip();

					const result = await handler.identify(fs2);
					assert.equal(result.valid, false);
				});
			}

		}); // identify() tests

		describe('open()', function() {

			it('should return valid items', async function() {
				// Skip tests if the game files are not present.
				if (!fs) this.skip();

				const game = new handler(fs);
				await game.open();
				const items = await game.items();

				assert.ok(items, 'items() returned an invalid value');
				assert.ok(Object.keys(items).length > 0, 'items() returned no items');

				// Walk the item list and ensure they are valid.
				function checkItems(prefix, startItems) {
					for (const [id, item] of Object.entries(startItems)) {
						assert.ok(item.title, `Missing ${prefix}${id}.title`);
						assert.ok(item.type, `Missing ${prefix}${id}.type`);
						if (!item.disabled) {
							assert.ok(!item.disabledReason, `Disabled reason given on non-disabled item ${prefix}${id}`);
						}
						if (item.children) checkItems(`${prefix}${id}.children.`, item.children);
					}
				}
				checkItems('', items);
			});

		}); // open() tests

	}); // Standard tests
}
