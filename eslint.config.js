import js from '@eslint/js';

export default [
    {
        ignores: ['node_modules/**', 'coverage/**']
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                process: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                Headers: 'readonly',
                URL: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { args: 'none' }],
            'no-empty': 'off',
            semi: ['error', 'always']
        }
    }
];
