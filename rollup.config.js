const pkg = require('./package.json')
const babel = require('rollup-plugin-babel')
const commonjs = require('rollup-plugin-commonjs')
const builtins = require('rollup-plugin-node-builtins')

export default {
  input: 'lib/index.js',
  output: [
    { file: pkg['main'], format: 'cjs', sourcemap: true },
    { file: pkg['module'], format: 'es', sourcemap: true }
  ],
  external: [
    'invariant',
    'jsona',
    'json-api-normalizer',
    '@orbit/core',
    'redux-object'
  ],
  globals: {
    invariant: 'INVARIANT',
    'jsona': 'JSONA',
    'json-api-normalizer': 'JSON_API_NORMALIZER',
    '@orbit/core': 'ORBIT_CORE',
    'redux-object': 'REDUX_OBJECT'
  },
  plugins: [
    builtins(),
    commonjs(),
    babel({
      exclude: 'node_modules/**',
      babelrc: false,
      presets: [
        [
          'es2015',
          {
            modules: false
          }
        ]
      ],
      plugins: [
        'external-helpers'
      ]
    })
  ]
}
