// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Pages are prerendered to static HTML; only /api/waitlist runs as a serverless function.
export default defineConfig({
  site: 'https://jobsoxo.com',
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'never',
  build: { format: 'file' },
});
