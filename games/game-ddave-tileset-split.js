/*
 * Details on how to chop up the Dangerous Dave 1 tileset to make it easier
 * to work with.
 *
 * This game is documented on the ModdingWiki:
 *   http://www.shikadi.net/moddingwiki/Dangerous_Dave
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

const mapTileNumbers = [ ...Array(53).keys() ]; // 0..52
const ddave_tileSplit = {
	vga: {
		'map': [
			[
				mapTileNumbers,
				[],
				[],
			],
		],
		'player': [
			[ // walking right
				[ 53, 54, 55 ],
				[ 60, 61, 62 ],
				[0, 1, 2, 1],
				200
			], [ // facing user
				[ 56 ],
				[ 63 ],
				[]
			], [ // walking left
				[ 57, 58, 59 ],
				[ 64, 65, 66 ],
				[0, 1, 2, 1],
				200
			], [ // jumping right
				[ 67 ],
				[ 69 ],
				[]
			], [ // jumping left
				[ 68 ],
				[ 70 ],
				[]
			], [ // climbing
				[ 71, 72, 73 ],
				[ 74, 75, 76 ],
				[0, 1, 2],
				150
			], [ // flying right
				[ 77, 78, 79 ],
				[ 83, 84, 85 ],
				[0, 1, 2],
				50
			], [ // flying left
				[ 80, 81, 82 ],
				[ 86, 87, 88 ],
				[0, 1, 2],
				50
			],
		],
		'monsters': [
			[ // monster 1 - spider
				[ 89, 90, 91, 92 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 2 - spiky ball
				[ 93, 94, 95, 96 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 3 - red sun
				[ 97, 98, 99, 100 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 4 - bone
				[ 101, 102, 103, 104 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 5 - flying saucer
				[ 105, 106, 107, 108 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 6 - split flying saucer
				[ 109, 110, 111, 112 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 7 - green orb
				[ 113, 114, 115, 116 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 8 - upright flying saucer
				[ 117, 118, 119, 120 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster bullet right
				[ 121, 122, 123 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // monster bullet left
				[ 124, 125, 126 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // player bullet left
				[ 127 ],
				[],
				[],
			], [ // player bullet right
				[ 128 ],
				[],
				[],
			], [ // explosion
				[ 129, 130, 131, 132 ],
				[],
				[ 0, 1, 2, 3 ],
				150,
			],
		],
		'ui': [
			[ [ 133 ], [], [], ], // Inventory - Jetpack
			[ [ 134 ], [], [], ], // Inventory - Gun
			[ [ 135 ], [], [], ], // Status - Lives
			[ [ 136 ], [], [], ], // Status - Level
			[ [ 137 ], [], [], ], // Status - Score
			[ [ 138 ], [], [], ], // Inventory - Door
			[ [ 139 ], [], [], ], // Message - Warp
			[ [ 140 ], [], [], ], // Message - Zone
			[ [ 141 ], [], [], ], // Inventory - Jetpack fuel
			[ [ 142 ], [], [], ], // Inventory - Jetpack fuel bar
			[ [ 143 ], [], [], ], // Status - Life icon
		],
		'title': [ // Title screen animation
			[
				[ 144, 145, 146, 147 ],
				[],
				[ 0, 1, 2, 3 ],
				80,
			],
		],
		'font': [ // Score/level numbers
			[
				[ 148, 149, 150, 151, 152, 153, 154, 155, 156, 157 ],
				[],
				[],
			],
		],
	},
	ega: {
		'map': [
			[
				mapTileNumbers,
				[],
				[],
			],
		],
		'player': [
			[ // walking right (S1)
				[ 53, 57, 61 ],
				[ 81, 85, 89 ],
				[0, 1, 2, 1],
				200
			], [ // walking right (S2)
				[ 54, 58, 62 ],
				[ 82, 86, 90 ],
				[0, 1, 2, 1],
				200
			], [ // walking right (S3)
				[ 55, 59, 63 ],
				[ 83, 87, 91 ],
				[0, 1, 2, 1],
				200
			], [ // walking right (S4)
				[ 56, 60, 64 ],
				[ 84, 88, 92 ],
				[0, 1, 2, 1],
				200
			], [ // facing user (S1)
				[ 65 ],
				[ 93 ],
				[]
			], [ // facing user (S2)
				[ 66 ],
				[ 94 ],
				[]
			], [ // facing user (S3)
				[ 67 ],
				[ 95 ],
				[]
			], [ // facing user (S4)
				[ 68 ],
				[ 96 ],
				[]
			], [ // walking left (S1)
				[ 69, 73, 77 ],
				[ 97, 101, 105 ],
				[0, 1, 2, 1],
				200
			], [ // walking left (S2)
				[ 70, 74, 78 ],
				[ 98, 102, 106 ],
				[0, 1, 2, 1],
				200
			], [ // walking left (S3)
				[ 71, 75, 79 ],
				[ 99, 103, 107 ],
				[0, 1, 2, 1],
				200
			], [ // walking left (S4)
				[ 72, 76, 80 ],
				[ 100, 104, 108 ],
				[0, 1, 2, 1],
				200
			], [ // jumping right (S1)
				[ 109 ],
				[ 117 ],
				[]
			], [ // jumping right (S2)
				[ 110 ],
				[ 118 ],
				[]
			], [ // jumping right (S3)
				[ 111 ],
				[ 119 ],
				[]
			], [ // jumping right (S4)
				[ 112 ],
				[ 120 ],
				[]
			], [ // jumping left (S1)
				[ 113 ],
				[ 121 ],
				[]
			], [ // jumping left (S2)
				[ 114 ],
				[ 122 ],
				[]
			], [ // jumping left (S3)
				[ 115 ],
				[ 123 ],
				[]
			], [ // jumping left (S4)
				[ 116 ],
				[ 124 ],
				[]
			], [ // climbing (S1)
				[ 125, 129, 133 ],
				[ 137, 141, 145 ],
				[0, 1, 2],
				150
			], [ // climbing (S2)
				[ 126, 130, 134 ],
				[ 138, 142, 146 ],
				[0, 1, 2],
				150
			], [ // climbing (S3)
				[ 127, 131, 135 ],
				[ 139, 143, 147 ],
				[0, 1, 2],
				150
			], [ // climbing (S4)
				[ 128, 132, 136 ],
				[ 140, 144, 148 ],
				[0, 1, 2],
				150
			], [ // flying right (S1)
				[ 149, 153, 157 ],
				[ 173, 177, 181 ],
				[0, 1, 2],
				50
			], [ // flying right (S2)
				[ 150, 154, 158 ],
				[ 174, 178, 182 ],
				[0, 1, 2],
				50
			], [ // flying right (S3)
				[ 151, 155, 159 ],
				[ 175, 179, 183 ],
				[0, 1, 2],
				50
			], [ // flying right (S4)
				[ 152, 156, 160 ],
				[ 176, 180, 184 ],
				[0, 1, 2],
				50
			], [ // flying left (S1)
				[ 161, 165, 169 ],
				[ 185, 189, 193 ],
				[0, 1, 2],
				50
			], [ // flying left (S2)
				[ 162, 166, 170 ],
				[ 186, 190, 194 ],
				[0, 1, 2],
				50
			], [ // flying left (S3)
				[ 163, 167, 171 ],
				[ 187, 191, 195 ],
				[0, 1, 2],
				50
			], [ // flying left (S4)
				[ 164, 168, 172 ],
				[ 188, 192, 196 ],
				[0, 1, 2],
				50
			],
		],
		'monsters': [
			[ // monster 1 - spider (S1)
				[ 197, 201, 205, 209 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 1 - spider (S2)
				[ 198, 202, 206, 210 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 1 - spider (S3)
				[ 199, 203, 207, 211 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 1 - spider (S4)
				[ 200, 204, 208, 212 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 2 - spiky ball (S1)
				[ 213, 217, 221, 225 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 2 - spiky ball (S2)
				[ 214, 218, 222, 226 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 2 - spiky ball (S3)
				[ 215, 219, 223, 227 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 2 - spiky ball (S4)
				[ 216, 220, 224, 228 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 3 - red sun (S1)
				[ 229, 233, 237, 241 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 3 - red sun (S2)
				[ 230, 234, 238, 242 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 3 - red sun (S3)
				[ 231, 235, 239, 243 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 3 - red sun (S4)
				[ 232, 236, 240, 244 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 4 - bone (S1)
				[ 245, 249, 253, 257 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 4 - bone (S2)
				[ 246, 250, 254, 258 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 4 - bone (S3)
				[ 247, 251, 255, 259 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 4 - bone (S4)
				[ 248, 252, 256, 260 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 5 - flying saucer (S1)
				[ 261, 265, 269, 273 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 5 - flying saucer (S2)
				[ 262, 266, 270, 274 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 5 - flying saucer (S3)
				[ 263, 267, 271, 275 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 5 - flying saucer (S4)
				[ 264, 268, 272, 276 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 6 - split flying saucer (S1)
				[ 277, 281, 285, 289 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 6 - split flying saucer (S2)
				[ 278, 282, 286, 290 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 6 - split flying saucer (S3)
				[ 279, 283, 287, 291 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 6 - split flying saucer (S4)
				[ 280, 284, 288, 292 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 7 - green orb (S1)
				[ 293, 297, 301, 305 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 7 - green orb (S2)
				[ 294, 298, 302, 306 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 7 - green orb (S3)
				[ 295, 299, 303, 307 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 7 - green orb (S4)
				[ 296, 300, 304, 308 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 8 - upright flying saucer (S1)
				[ 309, 313, 317, 321 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 8 - upright flying saucer (S2)
				[ 310, 314, 318, 322 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 8 - upright flying saucer (S3)
				[ 311, 315, 319, 323 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 8 - upright flying saucer (S4)
				[ 312, 316, 320, 324 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster bullet right (S1)
				[ 325, 329, 333 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // monster bullet right (S2)
				[ 326, 330, 334 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // monster bullet right (S3)
				[ 327, 331, 335 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // monster bullet right (S4)
				[ 328, 332, 336 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // monster bullet left (S1)
				[ 337, 341, 345 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // monster bullet left (S2)
				[ 338, 342, 346 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // monster bullet left (S3)
				[ 339, 343, 347 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // monster bullet left (S4)
				[ 340, 344, 348 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // player bullet left (S1)
				[ 349 ],
				[],
				[],
			], [ // player bullet left (S2)
				[ 350 ],
				[],
				[],
			], [ // player bullet left (S3)
				[ 351 ],
				[],
				[],
			], [ // player bullet left (S4)
				[ 352 ],
				[],
				[],
			], [ // player bullet right (S1)
				[ 353 ],
				[],
				[],
			], [ // player bullet right (S2)
				[ 354 ],
				[],
				[],
			], [ // player bullet right (S3)
				[ 355 ],
				[],
				[],
			], [ // player bullet right (S4)
				[ 356 ],
				[],
				[],
			], [ // explosion (S1)
				[ 357, 361, 365, 369 ],
				[],
				[ 0, 1, 2, 3 ],
				150,
			], [ // explosion (S2)
				[ 358, 362, 366, 370 ],
				[],
				[ 0, 1, 2, 3 ],
				150,
			], [ // explosion (S3)
				[ 359, 363, 367, 371 ],
				[],
				[ 0, 1, 2, 3 ],
				150,
			], [ // explosion (S4)
				[ 360, 364, 368, 372 ],
				[],
				[ 0, 1, 2, 3 ],
				150,
			],
		],
		'ui': [
			[ [ 373 ], [], [], ], // Inventory - Jetpack
			[ [ 374 ], [], [], ], // Inventory - Gun
			[ [ 375 ], [], [], ], // Status - Lives
			[ [ 376 ], [], [], ], // Status - Level
			[ [ 377 ], [], [], ], // Status - Score
			[ [ 378 ], [], [], ], // Inventory - Door
			[ [ 379 ], [], [], ], // Message - Warp
			[ [ 380 ], [], [], ], // Message - Zone
			[ [ 381 ], [], [], ], // Inventory - Jetpack fuel
			[ [ 382, 383, 384, 385 ], [], [], ], // Inventory - Jetpack fuel bar
			[ [ 386 ], [], [], ], // Status - Life icon
		],
		'title': [ // Title screen animation
			[
				[ 387, 388, 389, 390 ],
				[],
				[ 0, 1, 2, 3 ],
				80,
			],
		],
		'font': [ // Score/level numbers
			[
				[ 391, 392, 393, 394, 395, 396, 397, 398, 399, 400 ],
				[],
				[],
			],
		],
	},
	cga: {
		'map': [
			[
				mapTileNumbers,
				[],
				[],
			],
		],
		'player': [
			[ // walking right (S1)
				[ 53, 55, 57 ],
				[ 67, 69, 71 ],
				[0, 1, 2, 1],
				200
			], [ // walking right (S2)
				[ 54, 56, 58 ],
				[ 68, 70, 72 ],
				[0, 1, 2, 1],
				200
			], [ // facing user (S1)
				[ 59 ],
				[ 73 ],
				[]
			], [ // facing user (S2)
				[ 60 ],
				[ 74 ],
				[]
			], [ // walking left (S1)
				[ 61, 63, 65 ],
				[ 75, 77, 79 ],
				[0, 1, 2, 1],
				200
			], [ // walking left (S2)
				[ 62, 64, 66 ],
				[ 76, 78, 80 ],
				[0, 1, 2, 1],
				200
			], [ // jumping right (S1)
				[ 81 ],
				[ 85 ],
				[]
			], [ // jumping right (S2)
				[ 82 ],
				[ 86 ],
				[]
			], [ // jumping left (S1)
				[ 83 ],
				[ 87 ],
				[]
			], [ // jumping left (S2)
				[ 84 ],
				[ 88 ],
				[]
			], [ // climbing (S1)
				[ 89, 91, 93 ],
				[ 95, 97, 99 ],
				[0, 1, 2],
				150
			], [ // climbing (S2)
				[ 90, 92, 94 ],
				[ 96, 98, 100 ],
				[0, 1, 2],
				150
			], [ // flying right (S1)
				[ 101, 103, 105 ],
				[ 113, 115, 117 ],
				[0, 1, 2],
				50
			], [ // flying right (S2)
				[ 102, 104, 106 ],
				[ 114, 116, 118 ],
				[0, 1, 2],
				50
			], [ // flying left (S1)
				[ 107, 109, 111 ],
				[ 119, 121, 123 ],
				[0, 1, 2],
				50
			], [ // flying left (S2)
				[ 108, 110, 112 ],
				[ 120, 122, 124 ],
				[0, 1, 2],
				50
			],
		],
		'monsters': [
			[ // monster 1 - spider (S1)
				[ 125, 127, 129, 131 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 1 - spider (S2)
				[ 126, 128, 130, 132 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 2 - spiky ball (S1)
				[ 133, 135, 137, 139 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 2 - spiky ball (S2)
				[ 134, 136, 138, 140 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 3 - red sun (S1)
				[ 141, 143, 145, 147 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 3 - red sun (S2)
				[ 142, 144, 146, 148 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 4 - bone (S1)
				[ 149, 151, 153, 155 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 4 - bone (S2)
				[ 150, 152, 154, 156 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 5 - flying saucer (S1)
				[ 157, 159, 161, 163 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 5 - flying saucer (S2)
				[ 158, 160, 162, 164 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 6 - split flying saucer (S1)
				[ 165, 167, 169, 171 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 6 - split flying saucer (S2)
				[ 166, 168, 170, 172 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 7 - green orb (S1)
				[ 173, 175, 177, 179 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 7 - green orb (S2)
				[ 174, 176, 178, 180 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 8 - upright flying saucer (S1)
				[ 181, 183, 185, 187 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster 8 - upright flying saucer (S2)
				[ 182, 184, 186, 188 ],
				[],
				[ 0, 1, 2, 3 ],
				120
			], [ // monster bullet right (S1)
				[ 189, 191, 193 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // monster bullet right (S2)
				[ 190, 192, 194 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // monster bullet left (S1)
				[ 195, 197, 199 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // monster bullet left (S2)
				[ 196, 198, 200 ],
				[],
				[ 0, 1, 2 ],
				80
			], [ // player bullet left (S1)
				[ 201 ],
				[],
				[],
			], [ // player bullet left (S2)
				[ 202 ],
				[],
				[],
			], [ // player bullet right (S1)
				[ 203 ],
				[],
				[],
			], [ // player bullet right (S2)
				[ 204 ],
				[],
				[],
			], [ // explosion (S1)
				[ 205, 207, 209, 211 ],
				[],
				[ 0, 1, 2, 3 ],
				150,
			], [ // explosion (S2)
				[ 206, 208, 210, 212 ],
				[],
				[ 0, 1, 2, 3 ],
				150,
			],
		],
		'ui': [
			[ [ 213 ], [], [], ], // Inventory - Jetpack
			[ [ 214 ], [], [], ], // Inventory - Gun
			[ [ 215 ], [], [], ], // Status - Lives
			[ [ 216 ], [], [], ], // Status - Level
			[ [ 217 ], [], [], ], // Status - Score
			[ [ 218 ], [], [], ], // Inventory - Door
			[ [ 219 ], [], [], ], // Message - Warp
			[ [ 220 ], [], [], ], // Message - Zone
			[ [ 221 ], [], [], ], // Inventory - Jetpack fuel
			[ [ 222, 223 ], [], [], ], // Inventory - Jetpack fuel bar
			[ [ 224 ], [], [], ], // Status - Life icon
		],
		'title': [ // Title screen animation
			[
				[ 225, 226, 227, 228 ],
				[],
				[ 0, 1, 2, 3 ],
				80,
			],
		],
		'font': [ // Score/level numbers
			[
				[ 229, 230, 231, 232, 233, 234, 235, 236, 237, 238 ],
				[],
				[],
			],
		],
	}
};

export default ddave_tileSplit;
