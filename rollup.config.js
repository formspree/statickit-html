import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

const plugins = [
  nodeResolve(),
  commonjs({
    include: 'node_modules/**'
  }),
  babel({
    exclude: 'node_modules/**'
  })
];

export default [
  {
    input: 'src/index.js',
    plugins: plugins,
    output: {
      format: 'iife',
      name: 'statickit',
      file: __dirname + '/dist/statickit.js'
    }
  },
  {
    input: 'src/index.js',
    plugins: plugins.concat(terser()),
    output: {
      format: 'iife',
      name: 'statickit',
      file: __dirname + '/dist/statickit.min.js'
    }
  },
  {
    input: 'src/index.js',
    plugins: plugins,
    output: {
      format: 'umd',
      name: 'statickit',
      file: __dirname + '/dist/statickit.umd.js'
    }
  },
  {
    input: 'src/index.js',
    plugins: plugins,
    output: {
      format: 'esm',
      name: 'statickit',
      file: __dirname + '/dist/statickit.esm.js'
    }
  }
];
