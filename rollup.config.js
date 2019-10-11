import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

const unbundledPlugins = [
  nodeResolve({
    only: ['object-assign']
  }),
  commonjs(),
  babel({
    exclude: 'node_modules/**'
  })
];

const bundlePlugins = [
  nodeResolve(),
  commonjs(),
  babel({
    exclude: 'node_modules/**'
  })
];

export default [
  {
    input: 'src/index.js',
    plugins: bundlePlugins,
    output: {
      format: 'iife',
      name: 'statickit',
      file: __dirname + '/public/statickit.js'
    }
  },
  {
    input: 'src/index.js',
    plugins: bundlePlugins.concat(terser()),
    output: {
      format: 'iife',
      name: 'statickit',
      file: __dirname + '/public/statickit.min.js'
    }
  },
  {
    external: ['@statickit/core', 'hyperscript'],
    input: 'src/index.js',
    plugins: unbundledPlugins,
    output: {
      format: 'cjs',
      name: 'statickit',
      file: __dirname + '/dist/statickit.cjs.js'
    }
  },
  {
    external: ['@statickit/core', 'hyperscript'],
    input: 'src/index.js',
    plugins: unbundledPlugins,
    output: {
      format: 'esm',
      name: 'statickit',
      file: __dirname + '/dist/statickit.esm.js'
    }
  }
];
