import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset paths also work when the build is hosted in a subfolder.
  base: './',
  test: { environment: 'jsdom', include: ['src/**/*.test.jsx'] },
});
