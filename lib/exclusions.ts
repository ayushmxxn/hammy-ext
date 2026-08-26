export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(trimmed);
  try {
    const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/\.$/, '');
    return host || null;
  } catch {
    return null;
  }
}
export function isDomainExcluded(
  hostname: string,
  excludedSites: string[]
): boolean {
  const host = hostname.toLowerCase();
  return excludedSites.some(
    (entry) => host === entry || host.endsWith(`.${entry}`)
  );
}
export function isUrlExcluded(url: string, excludedSites: string[]): boolean {
  if (excludedSites.length === 0) return false;
  try {
    return isDomainExcluded(new URL(url).hostname, excludedSites);
  } catch {
    return false;
  }
}