import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:5076',
                changeOrigin: true,
            },
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        globals: true,
        css: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './coverage',
            include: [
                'src/utils/**/*.ts',
                'src/hooks/**/*.ts',
                'src/components/**/*.{ts,tsx}',
                'src/contexts/**/*.{ts,tsx}',
                'src/App.tsx',
                'src/services/api.ts',
                'src/pages/LoginPage.tsx',
                'src/pages/CompleteProfilePage.tsx',
                'src/pages/ReportIssuePage.tsx',
            ],
            exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
            thresholds: {
                lines: 70,
                branches: 65,
                functions: 70,
                statements: 70,
            },
        },
    },
});
