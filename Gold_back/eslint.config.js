module.exports = [
  { ignores: ['node_modules/', 'dist/', '*.config.js'] },
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs' },
    rules: { 
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }], 
      'no-console': 'off' 
    }
  }
];