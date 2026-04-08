export function maskName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);

  return parts
    .map((part) => {
      if (part.length <= 2) {
        return `${part[0] ?? ""}*`;
      }
      return `${part[0]}${"*".repeat(Math.max(part.length - 2, 1))}${part.at(-1)}`;
    })
    .join(" ");
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return "hidden@hidden";
  }

  const visibleStart = local.slice(0, 1);
  const visibleEnd = local.slice(-1);
  const maskedMiddle = "*".repeat(Math.max(local.length - 2, 4));

  return `${visibleStart}${maskedMiddle}${visibleEnd}@${domain}`;
}
