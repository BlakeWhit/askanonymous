import type { NextConfig } from "next";

// Auto-derive basePath for GitHub Pages when building in Actions or via env override
function resolveBasePath(): string {
  // Highest priority: explicit env override
  const explicit = process.env.BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH;
  if (explicit !== undefined) return explicit;

  // If building in GitHub Actions, infer from GITHUB_REPOSITORY (owner/repo)
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo && repo.includes('/')) {
    const [owner, name] = repo.split('/');
    const isUserSite = name === `${owner}.github.io`;
    return isUserSite ? '' : `/${name}`;
  }

  // Default: no basePath (root)
  return '';
}

const derivedBasePath = resolveBasePath();

const baseConfig: NextConfig = {
  // Static export for GitHub Pages
  output: 'export',
  // Ensure URLs work on Pages (directories map to index.html)
  trailingSlash: true,
  // Prefix assets so _next works under a repo subpath
  basePath: derivedBasePath,
  assetPrefix: derivedBasePath || undefined,
  // Next/Image on static hosts
  images: { unoptimized: true },
};

// Enable Next headers only if explicitly requested (useful for dev or Node server).
// On static export (GitHub Pages), headers are not supported and cause warnings.
const enableHeaders = process.env.NEXT_ENABLE_HEADERS === '1';

const nextConfig: NextConfig = enableHeaders
  ? {
      ...baseConfig,
      headers() {
        return Promise.resolve([
          {
            source: '/',
            headers: [
              { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
              { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
            ],
          },
        ]);
      },
    }
  : baseConfig;

export default nextConfig;


