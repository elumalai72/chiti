import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('CHITI Mobile Responsiveness & PWA Assets Integrity', () => {
  const publicDir = path.resolve(__dirname, '../public');
  const srcDir = path.resolve(__dirname, '../src');

  it('verifies manifest.webmanifest exists and is valid PWA manifest', () => {
    const manifestPath = path.join(publicDir, 'manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifestContent.name).toBe('CHITI — Chiti Management Platform');
    expect(manifestContent.short_name).toBe('CHITI');
    expect(manifestContent.display).toBe('standalone');
    expect(manifestContent.theme_color).toBe('#070B14');
    expect(manifestContent.background_color).toBe('#070B14');
    expect(manifestContent.icons.length).toBeGreaterThanOrEqual(3);
  });

  it('verifies PWA icon assets exist with non-zero size', () => {
    const icon192 = path.join(publicDir, 'icon-192.png');
    const icon512 = path.join(publicDir, 'icon-512.png');
    const maskable = path.join(publicDir, 'maskable-icon-512.png');
    const favicon = path.join(publicDir, 'favicon.svg');
    const logo = path.join(publicDir, 'logo.svg');

    expect(fs.existsSync(icon192)).toBe(true);
    expect(fs.statSync(icon192).size).toBeGreaterThan(500);

    expect(fs.existsSync(icon512)).toBe(true);
    expect(fs.statSync(icon512).size).toBeGreaterThan(1000);

    expect(fs.existsSync(maskable)).toBe(true);
    expect(fs.statSync(maskable).size).toBeGreaterThan(1000);

    expect(fs.existsSync(favicon)).toBe(true);
    expect(fs.existsSync(logo)).toBe(true);
  });

  it('verifies index.html has correct mobile viewport, theme-color, and manifest links', () => {
    const indexPath = path.resolve(__dirname, '../index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    expect(indexHtml).toContain('viewport-fit=cover');
    expect(indexHtml).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(indexHtml).toContain('name="theme-color" content="#070B14"');
    expect(indexHtml).toContain('name="mobile-web-app-capable" content="yes"');
  });

  it('verifies designSystem.css contains safe area variables and mobile responsive utility classes', () => {
    const cssPath = path.join(srcDir, 'styles/designSystem.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    expect(css).toContain('--safe-bottom: env(safe-area-inset-bottom');
    expect(css).toContain('--safe-top: env(safe-area-inset-top');
    expect(css).toContain('.mobile-only');
    expect(css).toContain('.desktop-only');
    expect(css).toContain('.bottom-nav');
    expect(css).toContain('calc(76px + var(--safe-bottom))');
  });
});
