import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import inject from 'rollup-plugin-inject';
import replace from 'rollup-plugin-replace';
import path from 'path';
import progress from 'rollup-plugin-progress';
import filesize from 'rollup-plugin-filesize';


export default {
  input: 'src/index.js',
  output: {
    format: 'iife',
    name: 'app',
    file: 'public/bundle.r.js',
    sourcemap: true,
  },
  plugins: [
    progress(),
    filesize(),
    resolve({
        jsnext: true,
    }),
    replace({
      ENV: JSON.stringify('dev'),
    }),
    commonjs({
      include: 'node_modules/**',
      ignore: ['jquery'],
    }),
    inject({
        modules: {
            '_': 'underscore',
            Backbone: path.resolve( 'src/backboneConfig.js'),
        },
    }),
  ]
};
