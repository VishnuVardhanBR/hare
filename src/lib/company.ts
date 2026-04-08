const COMPANY_STOP_WORDS = new Set([
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "co",
  "company",
  "llc",
  "ltd",
  "limited"
]);

export function normalizeCompanyName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !COMPANY_STOP_WORDS.has(token))
    .join(" ")
    .trim();
}

export function sanitizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();
}

export function getDomainFromEmail(email: string): string {
  const [, domain = ""] = email.split("@");
  return domain.trim().toLowerCase();
}

export function domainLikelyMatchesCompany(domain: string, companyDomain: string): boolean {
  const cleanDomain = sanitizeDomain(domain);
  const cleanCompanyDomain = sanitizeDomain(companyDomain);

  return (
    cleanDomain === cleanCompanyDomain ||
    cleanDomain.endsWith(`.${cleanCompanyDomain}`) ||
    cleanCompanyDomain.endsWith(`.${cleanDomain}`)
  );
}
