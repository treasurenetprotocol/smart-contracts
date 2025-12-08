'use strict';

module.exports = {
  root: true,
  extends: ['eslint-config-treasurenet/node'],
  env: {
    mocha: true,
    es2020: true
  },
  parserOptions: {
    ecmaVersion: 2022
  },
  overrides: [
    {
      files: ['scripts/**/*.js'],
      globals: {
        artifacts: 'readonly',
        web3: 'readonly'
      },
      rules: {
        'no-await-in-loop': 'off',
        'require-atomic-updates': 'off',
        radix: 'off',
        'prefer-destructuring': 'off',
        'no-param-reassign': 'off',
        'no-unused-vars': 'off',
        'no-nested-ternary': 'off'
      }
    },
    {
      files: ['scripts/upgrade/**/*.js'],
      globals: {
        artifacts: 'readonly'
      },
      rules: {
        'no-undef': 'off'
      }
    },
    {
      files: ['test/**/*.js'],
      rules: {
        'no-await-in-loop': 'off',
        'no-bitwise': 'off',
        'no-empty': 'off',
        'no-mixed-operators': 'off',
        'no-nested-ternary': 'off',
        'require-atomic-updates': 'off'
      }
    }
  ]
};
