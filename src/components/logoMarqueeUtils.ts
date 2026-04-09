export type LogoCompanyInput = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export type RenderableLogoCompany = {
  id: string;
  name: string;
  logoUrl: string;
};

export function getRenderableLogoCompanies(
  companies: LogoCompanyInput[]
): RenderableLogoCompany[] {
  return companies.flatMap((company) => {
    const logoUrl = company.logoUrl?.trim();
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
