#!/usr/bin/env node
/**
 * build-frontend.js — prebuild script for Railway deployment
 *
 * Nixpacks auto-detects and runs:
 *   1. npm ci          (installs root devDeps including Vite)
 *   2. cd backend && npm install && npx prisma generate && npm run build
 *
 * "npm run build" triggers this prebuild script first, which:
 *   - Builds the Vite frontend from the repo root
 *   - Copies the output (dist/) into backend/public/
 *
 * Express then serves backend/public/ as the SPA static root.
 * In local dev (no dist/ at root) the script exits silently.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '../..');
const backendDir = path.resolve(__dirname, '..');
const distSrc = path.join(rootDir, 'dist');
const distDest = path.join(backendDir, 'public');

// Skip in local dev if no root package.json or already has public/
if (!fs.existsSync(path.join(rootDir, 'vite.config.ts'))) {
  console.log('[prebuild] No vite.config.ts found at root — skipping frontend build');
  process.exit(0);
}

try {
  console.log('[prebuild] Building Vite frontend from', rootDir);

  // Install root devDeps (Vite etc.) — fast if already cached by npm ci
  execSync('npm install', { cwd: rootDir, stdio: 'inherit' });

  // Build frontend
  execSync('npx vite build', { cwd: rootDir, stdio: 'inherit' });

  // Copy dist/ → backend/public/
  if (!fs.existsSync(distSrc)) {
    console.warn('[prebuild] dist/ not found after build — frontend will not be served');
    process.exit(0);
  }

  if (fs.existsSync(distDest)) {
    fs.rmSync(distDest, { recursive: true, force: true });
  }
  fs.cpSync(distSrc, distDest, { recursive: true });

  console.log('[prebuild] ✅ Frontend built and copied to backend/public/');
} catch (err) {
  // Non-fatal: backend API works without frontend
  console.warn('[prebuild] ⚠️  Frontend build failed (backend-only mode):', err.message);
}
