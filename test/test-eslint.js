import lint from 'mocha-eslint';

const paths = [
	'index.js',
	'cli/*.js',
	'games',
	'interface',
	'test',
	'util',
];

lint(paths);
