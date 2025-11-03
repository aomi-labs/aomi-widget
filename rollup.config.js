import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import { dts } from 'rollup-plugin-dts';

const external = ['react', 'react-dom'];

const IGNORE_CIRCULAR_REGEX = /node_modules\//;

function onWarn(warning, warn) {
  if (warning.code === 'CIRCULAR_DEPENDENCY' && IGNORE_CIRCULAR_REGEX.test(warning.message ?? '')) {
    return;
  }

  warn(warning);
}

export default defineConfig([
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.mjs',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    external,
    onwarn: onWarn,
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
      postcss({
        extract: 'styles.css',
        minimize: true,
      }),
    ],
  },
  
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      inlineDynamicImports: true,
    },
    external,
    onwarn: onWarn,
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
      postcss({
        extract: false,
        inject: false,
      }),
    ],
  },
  
  // UMD build for browser
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'AomiWidget',
      sourcemap: true,
      inlineDynamicImports: true,
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM',
      },
    },
    external,
    onwarn: onWarn,
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
      postcss({
        extract: false,
        inject: true,
      }),
    ],
  },
  
  // TypeScript declarations
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es',
    },
    external,
    onwarn: onWarn,
    plugins: [
      dts({
        tsconfig: './tsconfig.json',
      }),
    ],
  },
]);
