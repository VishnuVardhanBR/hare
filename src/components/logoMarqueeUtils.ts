export type LogoCompanyInput = {
  id: string;
  name: string;
  domain: string | null;
};

export type RenderableLogoCompany = {
  id: string;
  name: string;
  logoUrl: string;
};

type LogoDevOptions = {
  size?: number;
  format?: "png" | "jpg" | "webp";
};

const LOGO_DEV_BASE_URL = "https://img.logo.dev";

function sanitizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();
}

export function buildLogoDevUrl(
  domain: string,
  token: string | null | undefined,
  options: LogoDevOptions = {}
): string | null {
  const cleanToken = token?.trim();
  const cleanDomain = sanitizeDomain(domain);

  if (!cleanToken || !cleanDomain) {
    return null;
  }

  const size = options.size ?? 128;
  const format = options.format ?? "png";
  const params = new URLSearchParams({
    token: cleanToken,
    size: String(size),
    format,
    fallback: "404"
  });

  return `${LOGO_DEV_BASE_URL}/${cleanDomain}?${params.toString()}`;
}

export function getRenderableLogoCompanies(
  companies: LogoCompanyInput[],
  token: string | null | undefined
): RenderableLogoCompany[] {
  return companies.flatMap((company) => {
    const logoUrl = buildLogoDevUrl(company.domain ?? "", token);
    if (!logoUrl) {
      return [];
    }

    return [
      {
        id: company.id,
        name: company.name,
        logoUrl
      }
    ];
  });
}
