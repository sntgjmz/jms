/**
 * Builds a link to a file placed in Vite's public directory.
 *
 * GitHub Pages project sites live below a repository path, while local Vite
 * development lives at the domain root. Vite supplies the correct base for
 * each environment through BASE_URL.
 */
export function sitePath(path: string) {
  if (!path.startsWith("/")) return path;
  return `${import.meta.env.BASE_URL}${path.slice(1)}`;
}
