import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/**/*.spec.js'],
        setupFiles: ['./test/setup-env.js'],
        coverage: {
            provider: 'v8',
            include: ['lib/**', 'drivers/**', 'router.js', 'setup.js'],
            all: true,
            thresholds: {
                statements: 60,
                functions: 60,
                branches: 40
            }
        }
    }
});
