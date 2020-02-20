import svelte from 'rollup-plugin-svelte';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import json from 'rollup-plugin-json';

export default [
	{
		input: ['app/renderer.js'],
		output: {
			dir: 'public/build',
			format: 'cjs',
			sourcemap: true
		},
		plugins: [
			resolve({
				preferBuiltins: true // for electron, maybe this is needed?
			}),
			svelte({
				css: css => {
					css.write('public/build/bundle.css')
				}
			}),
			commonjs(),
			json()
		],
		// experimentalCodeSplitting: true,
		// experimentalDynamicImport: true,
		external: [
			'electron',
			'child_process',
			'fs',
			'path',
			'url',
			'module',
			'os'
		]
	}
];