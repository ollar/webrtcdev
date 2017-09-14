import commonjs from 'rollup-plugin-commonjs';
import jst from 'rollup-plugin-jst';
import resolve from 'rollup-plugin-node-resolve';
import inject from 'rollup-plugin-inject';


export default {
  input: 'src/index.js',
  output: {
    format: 'cjs',
    name: 'app',
    file: 'public/bundle.r.js',
  },
  plugins: [
    jst(),
    resolve({
        jsnext: true,
    }),
    commonjs(),
    inject({
        modules: {
            '_': 'underscore',
            Backbone: 'backbone',
        },
    }),
  ]
};
