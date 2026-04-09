import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import net from "node:net";

import {
  domainLikelyMatchesCompany,
  getDomainFromEmail,
  sanitizeDomain
} from "@/lib/company";

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "live.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "mail.com",
  "gmx.com",
  "zoho.com",
  "pm.me",
  "proton.me",
  "protonmail.com"
]);

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;

  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function readFloatEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseVerificationProvider(): "abstract" | "smtp" {
  const raw = (process.env.EMAIL_VERIFICATION_PROVIDER ?? "abstract").trim().toLowerCase();
  return raw === "smtp" ? "smtp" : "abstract";
}

function readAbstractApiKeys(): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (value: string | undefined) => {
    const normalized = (value ?? "").trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    ordered.push(normalized);
  };

  push(process.env.ABSTRACT_API_KEY);

  const fromList = (process.env.ABSTRACT_API_KEYS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const key of fromList) {
    push(key);
  }

  push(process.env.ABSTRACT_API_KEY_SECONDARY);

  return ordered;
}

const smtpNextAllowedByDomain = new Map<string, number>();
const smtpQueueByDomain = new Map<string, Promise<void>>();
const DNS_CACHE_TTL_MS = readPositiveIntEnv("EMAIL_DNS_CACHE_TTL_MS", 10 * 60 * 1000);
const DNS_NEGATIVE_CACHE_TTL_MS = readPositiveIntEnv("EMAIL_DNS_NEGATIVE_CACHE_TTL_MS", 2 * 60 * 1000);
const SMTP_MIN_INTERVAL_MS = readPositiveIntEnv("SMTP_MIN_INTERVAL_MS", 5000);
const SMTP_CONNECT_TIMEOUT_MS = readPositiveIntEnv("SMTP_CONNECT_TIMEOUT_MS", 4500);
const SMTP_MAX_MX_HOSTS = readPositiveIntEnv("SMTP_MAX_MX_HOSTS", 3);
const SMTP_CHECK_ENABLED = readBooleanEnv("SMTP_CHECK_ENABLED", process.env.VERCEL !== "1");
const ABSTRACT_API_BASE_URL = (
  process.env.ABSTRACT_API_BASE_URL ?? "https://emailreputation.abstractapi.com/v1/"
).trim();
const ABSTRACT_TIMEOUT_MS = readPositiveIntEnv("ABSTRACT_TIMEOUT_MS", 5000);
const ABSTRACT_MIN_INTERVAL_MS = readPositiveIntEnv("ABSTRACT_MIN_INTERVAL_MS", 1000);
const ABSTRACT_MIN_QUALITY_SCORE = clamp(
  readFloatEnv("ABSTRACT_MIN_QUALITY_SCORE", 0.7),
  0,
  1
);
const ABSTRACT_API_KEYS = readAbstractApiKeys();
const EMAIL_VERIFICATION_PROVIDER = parseVerificationProvider();
let abstractNextAllowedAt = 0;
let abstractQueue: Promise<void> = Promise.resolve();

type MailHostLookup =
  | {
      status: "ok";
      hosts: string[];
    }
  | {
      status: "none";
    };

const domainMailHostCache = new Map<
  string,
  {
    expiresAt: number;
    value: MailHostLookup;
  }
>();

export type VerificationResult = {
  status: "verified" | "failed";
  note: string;
  lastVerifiedAt: Date | null;
};

type VerifyInput = {
  email: string;
  companyDomain: string;
  knownDomains?: string[];
};

function isEmailFormatValid(email: string): boolean {
  if (email.length > 254) return false;

  const split = email.split("@");
  if (split.length !== 2) return false;

  const [localPart = "", domainPart = ""] = split;
  if (!localPart || !domainPart || localPart.length > 64) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) return false;

  const normalizedDomain = sanitizeDomain(domainPart);
  if (!normalizedDomain || normalizedDomain.length > 253 || normalizedDomain.includes("..")) return false;
  if (!/^[a-z0-9.-]+$/.test(normalizedDomain)) return false;

  const labels = normalizedDomain.split(".");
  if (labels.length < 2) return false;

  return labels.every(
    (label) => !!label && label.length <= 63 && !label.startsWith("-") && !label.endsWith("-")
  );
}

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.+$/, "");
}

type SmtpResult = "confirmed" | "unconfirmed" | "rejected" | "error";

function cacheDomainMailHosts(domain: string, value: MailHostLookup, ttlMs: number): MailHostLookup {
  domainMailHostCache.set(domain, {
    expiresAt: Date.now() + ttlMs,
    value
  });
  return value;
}

async function resolveMailHostsForDomain(domain: string): Promise<MailHostLookup> {
  const cached = domainMailHostCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let mxRecords: Awaited<ReturnType<typeof resolveMx>> = [];
  try {
    mxRecords = await resolveMx(domain);
  } catch {
    mxRecords = [];
  }

  const explicitNullMx = mxRecords.some(
    (record) => record.priority === 0 && normalizeHost(record.exchange) === ""
  );

  if (explicitNullMx) {
    return cacheDomainMailHosts(domain, { status: "none" }, DNS_NEGATIVE_CACHE_TTL_MS);
  }

  const mxHosts = Array.from(
    new Set(
      mxRecords
        .sort((a, b) => a.priority - b.priority)
        .map((record) => normalizeHost(record.exchange))
        .filter(Boolean)
    )
  );

  if (mxHosts.length > 0) {
    return cacheDomainMailHosts(domain, { status: "ok", hosts: mxHosts }, DNS_CACHE_TTL_MS);
  }

  const [aLookup, aaaaLookup] = await Promise.allSettled([resolve4(domain), resolve6(domain)]);
  const hasFallbackAddress =
    (aLookup.status === "fulfilled" && aLookup.value.length > 0) ||
    (aaaaLookup.status === "fulfilled" && aaaaLookup.value.length > 0);

  if (hasFallbackAddress) {
    return cacheDomainMailHosts(
      domain,
      {
        status: "ok",
        hosts: [domain]
      },
      DNS_CACHE_TTL_MS
    );
  }

  return cacheDomainMailHosts(domain, { status: "none" }, DNS_NEGATIVE_CACHE_TTL_MS);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithDomainRateLimit<T>(domain: string, task: () => Promise<T>): Promise<T> {
  const previous = smtpQueueByDomain.get(domain) ?? Promise.resolve();
  let releaseLock: (() => void) | undefined;
  const lock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  const queueEntry = previous.catch(() => undefined).then(() => lock);
  smtpQueueByDomain.set(domain, queueEntry);

  await previous.catch(() => undefined);

  const now = Date.now();
  const nextAllowedAt = smtpNextAllowedByDomain.get(domain) ?? now;
  if (nextAllowedAt > now) {
    await wait(nextAllowedAt - now);
  }

  smtpNextAllowedByDomain.set(domain, Date.now() + SMTP_MIN_INTERVAL_MS);

  try {
    return await task();
  } finally {
    releaseLock?.();
    if (smtpQueueByDomain.get(domain) === queueEntry) {
      smtpQueueByDomain.delete(domain);
    }
  }
}

async function runWithAbstractRateLimit<T>(task: () => Promise<T>): Promise<T> {
  const previous = abstractQueue;
  let releaseLock: (() => void) | undefined;
  const lock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  abstractQueue = previous.catch(() => undefined).then(() => lock);

  await previous.catch(() => undefined);

  const now = Date.now();
  if (abstractNextAllowedAt > now) {
    await wait(abstractNextAllowedAt - now);
  }

  abstractNextAllowedAt = Date.now() + ABSTRACT_MIN_INTERVAL_MS;

  try {
    return await task();
  } finally {
    releaseLock?.();
  }
}

async function verifyMailboxViaSMTP(mxHost: string, email: string): Promise<SmtpResult> {
  const envelopeDomain = getDomainFromEmail(email) || "localhost";

  return new Promise((resolve) => {
    const socket = net.createConnection({ host: mxHost, port: 25 });
    let stage: "greeting" | "ehlo" | "helo" | "mailfrom" | "rcptto" | "done" = "greeting";
    let buffer = "";
    let triedHeloFallback = false;
    let triedMailFromFallback = false;

    const finish = (result: SmtpResult) => {
      if (stage !== "done") {
        stage = "done";
        try {
          socket.write("QUIT\r\n");
        } catch {
          // ignore write errors during cleanup
        }
        socket.removeAllListeners();
        if (!socket.destroyed) {
          socket.destroy();
        }
        resolve(result);
      }
    };

    const sendCommand = (command: string) => {
      if (stage !== "done") {
        socket.write(`${command}\r\n`);
      }
    };

    socket.setTimeout(SMTP_CONNECT_TIMEOUT_MS);
    socket.once("timeout", () => finish("error"));
    socket.once("error", () => finish("error"));
    socket.once("close", () => finish("error"));

    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\r\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line) continue;
        const codeText = line.substring(0, 3);
        if (!/^\d{3}$/.test(codeText)) {
          continue;
        }

        const code = Number.parseInt(codeText, 10);

        // Multi-line responses have a dash after the code; wait for final line
        if (line[3] === "-") continue;

        switch (stage) {
          case "greeting":
            if (code === 220) {
              stage = "ehlo";
              sendCommand("EHLO hare.local");
            } else {
              finish("error");
            }
            break;
          case "ehlo":
            if (code === 250) {
              stage = "mailfrom";
              sendCommand("MAIL FROM:<>");
            } else if (
              !triedHeloFallback &&
              (code === 500 || code === 501 || code === 502 || code === 504)
            ) {
              triedHeloFallback = true;
              stage = "helo";
              sendCommand("HELO hare.local");
            } else {
              finish("error");
            }
            break;
          case "helo":
            if (code === 250) {
              stage = "mailfrom";
              sendCommand("MAIL FROM:<>");
            } else {
              finish("error");
            }
            break;
          case "mailfrom":
            if (code === 250) {
              stage = "rcptto";
              sendCommand(`RCPT TO:<${email}>`);
            } else if (!triedMailFromFallback && code >= 500 && code <= 599) {
              triedMailFromFallback = true;
              sendCommand(`MAIL FROM:<verify@${envelopeDomain}>`);
            } else if (code >= 400 && code <= 499) {
              finish("unconfirmed");
            } else {
              finish("error");
            }
            break;
          case "rcptto":
            if (code === 250 || code === 251) {
              finish("confirmed");
            } else if (code === 550 || code === 551 || code === 553) {
              finish("rejected");
            } else if ((code >= 400 && code <= 499) || (code >= 500 && code <= 599)) {
              // Most production servers intentionally avoid definitive mailbox responses.
              finish("unconfirmed");
            } else {
              finish("unconfirmed");
            }
            break;
        }
      }
    });
  });
}

async function verifyMailboxAcrossHosts(mailHosts: string[], email: string): Promise<SmtpResult> {
  const hostsToTry = mailHosts.slice(0, Math.max(1, SMTP_MAX_MX_HOSTS));
  if (hostsToTry.length === 0) {
    return "error";
  }

  let sawRejected = false;
  let sawUnconfirmed = false;
  let sawError = false;

  for (const host of hostsToTry) {
    const result = await verifyMailboxViaSMTP(host, email);
    if (result === "confirmed") {
      return "confirmed";
    }
    if (result === "rejected") {
      sawRejected = true;
      continue;
    }
    if (result === "unconfirmed") {
      sawUnconfirmed = true;
      continue;
    }
    sawError = true;
  }

  if (sawRejected && !sawUnconfirmed && !sawError) {
    return "rejected";
  }
  if (sawUnconfirmed || sawRejected) {
    return "unconfirmed";
  }
  return "error";
}

type AbstractBooleanField =
  | boolean
  | {
      value?: boolean | null;
      text?: string;
    }
  | null
  | undefined;

type AbstractEmailValidationPayload = {
  autocorrect?: string;
  auto_correct?: string;
  deliverability?: string;
  quality_score?: number | string | null;
  is_valid_format?: AbstractBooleanField;
  is_free_email?: AbstractBooleanField;
  is_disposable_email?: AbstractBooleanField;
  is_role_email?: AbstractBooleanField;
  is_catchall_email?: AbstractBooleanField;
  is_mx_found?: AbstractBooleanField;
  email_deliverability?: {
    status?: string;
    status_detail?: string;
    is_format_valid?: boolean | null;
    is_smtp_valid?: boolean | null;
    is_mx_valid?: boolean | null;
  };
  email_quality?: {
    score?: number | string | null;
    is_free_email?: boolean | null;
    is_disposable?: boolean | null;
    is_role?: boolean | null;
    is_catchall?: boolean | null;
  };
  email_risk?: {
    address_risk_status?: string | null;
    domain_risk_status?: string | null;
  };
};

function verificationFailed(note: string): VerificationResult {
  return {
    status: "failed",
    note,
    lastVerifiedAt: null
  };
}

function verificationSucceeded(note: string): VerificationResult {
  return {
    status: "verified",
    note,
    lastVerifiedAt: new Date()
  };
}

function parseAbstractBoolean(value: AbstractBooleanField): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (value && typeof value === "object" && "value" in value) {
    const nested = value.value;
    if (typeof nested === "boolean") {
      return nested;
    }
    if (nested === null) {
      return null;
    }
  }

  return null;
}

function parseAbstractScore(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isRiskTooHigh(risk: string | null | undefined): boolean {
  const normalized = (risk ?? "").trim().toLowerCase();
  return normalized === "medium" || normalized === "high";
}

async function verifyRecruiterEmailViaSmtp(
  normalizedEmail: string,
  emailDomain: string
): Promise<VerificationResult> {
  const mailHosts = await resolveMailHostsForDomain(emailDomain);
  if (mailHosts.status === "none") {
    return verificationFailed("Email domain has no MX records.");
  }

  if (!SMTP_CHECK_ENABLED) {
    return verificationSucceeded("Domain verified, mailbox unconfirmed.");
  }

  const smtpResult = await runWithDomainRateLimit(emailDomain, async () =>
    verifyMailboxAcrossHosts(mailHosts.hosts, normalizedEmail)
  );

  switch (smtpResult) {
    case "confirmed":
      return verificationSucceeded("Domain and mailbox verified.");
    case "rejected":
      return verificationFailed("Mailbox does not exist at this domain.");
    case "unconfirmed":
      return verificationSucceeded("Domain verified, mailbox unconfirmed.");
    case "error":
    default:
      return verificationSucceeded("Domain verified, mailbox unconfirmed.");
  }
}

function mapAbstractSuccess(payload: AbstractEmailValidationPayload): VerificationResult {
  const hasReputationShape =
    !!payload.email_deliverability ||
    !!payload.email_quality ||
    !!payload.email_risk;

  if (hasReputationShape) {
    return mapAbstractReputationSuccess(payload);
  }

  return mapAbstractValidationSuccess(payload);
}

function mapAbstractValidationSuccess(payload: AbstractEmailValidationPayload): VerificationResult {
  const deliverability = (payload.deliverability ?? "").trim().toUpperCase();
  const validFormat = parseAbstractBoolean(payload.is_valid_format);
  const isFreeEmail = parseAbstractBoolean(payload.is_free_email);
  const isDisposableEmail = parseAbstractBoolean(payload.is_disposable_email);
  const isRoleEmail = parseAbstractBoolean(payload.is_role_email);
  const isCatchallEmail = parseAbstractBoolean(payload.is_catchall_email);
  const isMxFound = parseAbstractBoolean(payload.is_mx_found);
  const qualityScore = parseAbstractScore(payload.quality_score);
  const autoCorrect = (payload.autocorrect ?? payload.auto_correct ?? "").trim();

  if (validFormat !== true) {
    return verificationFailed("Invalid email format.");
  }

  if (isDisposableEmail === true) {
    return verificationFailed("Disposable email domains are not allowed.");
  }

  if (isFreeEmail === true) {
    return verificationFailed("Free email providers are not allowed.");
  }

  if (isRoleEmail === true) {
    return verificationFailed("Role-based inboxes are not allowed.");
  }

  if (isCatchallEmail === true) {
    return verificationFailed("Catch-all inboxes are not accepted.");
  }

  if (isMxFound === false) {
    return verificationFailed("Email domain has no MX records.");
  }

  if (deliverability !== "DELIVERABLE") {
    if (deliverability === "UNDELIVERABLE" && autoCorrect) {
      return verificationFailed(`Undeliverable email. Did you mean ${autoCorrect}?`);
    }
    if (deliverability === "UNKNOWN") {
      return verificationFailed("Email deliverability could not be confirmed.");
    }
    return verificationFailed("Email is not deliverable.");
  }

  if (qualityScore === null || qualityScore < ABSTRACT_MIN_QUALITY_SCORE) {
    return verificationFailed("Email quality score is below the acceptance threshold.");
  }

  return verificationSucceeded("Deliverability verified via Abstract.");
}

function mapAbstractReputationSuccess(payload: AbstractEmailValidationPayload): VerificationResult {
  const deliverability = (payload.email_deliverability?.status ?? "").trim().toLowerCase();
  const isValidFormat = payload.email_deliverability?.is_format_valid === true;
  const isMxValid = payload.email_deliverability?.is_mx_valid;
  const qualityScore = parseAbstractScore(payload.email_quality?.score);
  const isFreeEmail = payload.email_quality?.is_free_email === true;
  const isDisposableEmail = payload.email_quality?.is_disposable === true;
  const isRoleEmail = payload.email_quality?.is_role === true;
  const isCatchallEmail = payload.email_quality?.is_catchall === true;
  const addressRisk = payload.email_risk?.address_risk_status;
  const domainRisk = payload.email_risk?.domain_risk_status;

  if (!isValidFormat) {
    return verificationFailed("Invalid email format.");
  }

  if (isDisposableEmail) {
    return verificationFailed("Disposable email domains are not allowed.");
  }

  if (isFreeEmail) {
    return verificationFailed("Free email providers are not allowed.");
  }

  if (isRoleEmail) {
    return verificationFailed("Role-based inboxes are not allowed.");
  }

  if (isCatchallEmail) {
    return verificationFailed("Catch-all inboxes are not accepted.");
  }

  if (isMxValid === false) {
    return verificationFailed("Email domain has no MX records.");
  }

  if (deliverability !== "deliverable") {
    if (deliverability === "unknown") {
      return verificationFailed("Email deliverability could not be confirmed.");
    }
    return verificationFailed("Email is not deliverable.");
  }

  if (qualityScore === null || qualityScore < ABSTRACT_MIN_QUALITY_SCORE) {
    return verificationFailed("Email quality score is below the acceptance threshold.");
  }

  if (isRiskTooHigh(addressRisk) || isRiskTooHigh(domainRisk)) {
    return verificationFailed("Email risk level is too high.");
  }

  return verificationSucceeded("Deliverability verified via Abstract.");
}

type AbstractRequestFailureReason =
  | "unauthorized"
  | "quota"
  | "rate_limited"
  | "service_unavailable"
  | "request_failed"
  | "invalid_response"
  | "network_error";

function mapAbstractFailureToMessage(reason: AbstractRequestFailureReason): string {
  switch (reason) {
    case "quota":
      return "Email verification quota reached. Please try again later.";
    case "rate_limited":
      return "Email verification is rate-limited. Please retry shortly.";
    case "invalid_response":
      return "Email verification service returned an invalid response.";
    case "network_error":
    case "service_unavailable":
    case "request_failed":
    case "unauthorized":
    default:
      return "Email verification service is unavailable.";
  }
}

function mapAbstractStatusToFailureReason(status: number): AbstractRequestFailureReason {
  if (status === 401) return "unauthorized";
  if (status === 422) return "quota";
  if (status === 429) return "rate_limited";
  if (status === 500 || status === 503) return "service_unavailable";
  return "request_failed";
}

async function verifyRecruiterEmailViaAbstract(
  normalizedEmail: string
): Promise<VerificationResult> {
  if (ABSTRACT_API_KEYS.length === 0) {
    return verificationFailed("Email verification service is unavailable.");
  }

  let lastFailure: AbstractRequestFailureReason = "service_unavailable";

  for (const apiKey of ABSTRACT_API_KEYS) {
    const url = new URL(ABSTRACT_API_BASE_URL);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("email", normalizedEmail);
    url.searchParams.set("auto_correct", "false");

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), ABSTRACT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await runWithAbstractRateLimit(async () =>
        fetch(url.toString(), {
          method: "GET",
          cache: "no-store",
          signal: controller.signal
        })
      );
    } catch {
      clearTimeout(timeoutHandle);
      lastFailure = "network_error";
      continue;
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!response.ok) {
      lastFailure = mapAbstractStatusToFailureReason(response.status);
      continue;
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      lastFailure = "invalid_response";
      continue;
    }

    if (!payload || typeof payload !== "object") {
      lastFailure = "invalid_response";
      continue;
    }

    return mapAbstractSuccess(payload as AbstractEmailValidationPayload);
  }

  return verificationFailed(mapAbstractFailureToMessage(lastFailure));
}

export async function verifyRecruiterEmail({
  email,
  companyDomain,
  knownDomains = []
}: VerifyInput): Promise<VerificationResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const emailDomain = getDomainFromEmail(normalizedEmail);

  if (!isEmailFormatValid(normalizedEmail)) {
    return {
      status: "failed",
      note: "Invalid email format.",
      lastVerifiedAt: null
    };
  }

  if (PERSONAL_EMAIL_DOMAINS.has(emailDomain)) {
    return {
      status: "failed",
      note: "Personal email domains are not allowed.",
      lastVerifiedAt: null
    };
  }

  const normalizedCompanyDomain = sanitizeDomain(companyDomain);
  const normalizedKnownDomains = knownDomains.map(sanitizeDomain).filter(Boolean);

  const domainMatchesCompany =
    domainLikelyMatchesCompany(emailDomain, normalizedCompanyDomain) ||
    normalizedKnownDomains.some((knownDomain) =>
      domainLikelyMatchesCompany(emailDomain, knownDomain)
    );

  if (!domainMatchesCompany) {
    return verificationFailed("Email domain does not match the selected company.");
  }

  if (EMAIL_VERIFICATION_PROVIDER === "smtp") {
    return verifyRecruiterEmailViaSmtp(normalizedEmail, emailDomain);
  }

  return verifyRecruiterEmailViaAbstract(normalizedEmail);
}
