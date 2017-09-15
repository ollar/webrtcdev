import commonjs from 'rollup-plugin-commonjs';
import jst from 'rollup-plugin-jst';
import resolve from 'rollup-plugin-node-resolve';
import inject from 'rollup-plugin-inject';
import replace from 'rollup-plugin-replace';
import path from 'path';


export default {
  input: 'src/index.js',
  output: {
    format: 'cjs',
    name: 'app',
    file: 'public/bundle.r.js',
    sourcemap: true,
  },
  plugins: [
    jst(),
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
