import globals from 'globals';
import {FlatCompat} from '@eslint/eslintrc';
import eslintConfigGoogle from 'eslint-config-google';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const filteredGoogleConfig = compat.config(eslintConfigGoogle).map((config) => {
  if (config.rules) {
    delete config.rules['valid-jsdoc'];
    delete config.rules['require-jsdoc'];
  }
  return config;
});


export default [
  ...filteredGoogleConfig,
  {
    files: ['**/*.js'],
    languageOptions: {sourceType: 'commonjs'},
    rules: {
      'no-tabs': 'off',
      'indent': ['error', 'tab'], // Bc I like tabs :P
      'linebreak-style': 'off', // Bc why?
      'no-unused-vars': 'warn',
      'no-console': 'error',
    },
  },
  {languageOptions: {globals: globals.node}},
];
