module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'quote-props': ['warn', 'as-needed'],
    'prefer-template': 'warn',
    'no-trailing-spaces': 'warn',
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'max-len': ['warn', { code: 120, ignoreUrls: true, ignoreStrings: true }],
    'arrow-parens': ['error', 'always'],
    'no-else-return': 'warn',
    'prefer-arrow-callback': 'warn',
    'no-param-reassign': ['error', { props: false }]
  }
};

