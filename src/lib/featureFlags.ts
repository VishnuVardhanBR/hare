function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function isCreditPurchasesEnabled(): boolean {
  return parseBooleanFlag(process.env.ENABLE_CREDIT_PURCHASES, false);
}
