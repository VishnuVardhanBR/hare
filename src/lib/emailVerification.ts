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

const smtpNextAllowedByDomain = new Map<string, number>();
const smtpQueueByDomain = new Map<string, Promise<void>>();
const DNS_CACHE_TTL_MS = readPositiveIntEnv("EMAIL_DNS_CACHE_TTL_MS", 10 * 60 * 1000);
const DNS_NEGATIVE_CACHE_TTL_MS = readPositiveIntEnv("EMAIL_DNS_NEGATIVE_CACHE_TTL_MS", 2 * 60 * 1000);
const SMTP_MIN_INTERVAL_MS = readPositiveIntEnv("SMTP_MIN_INTERVAL_MS", 5000);
const SMTP_CONNECT_TIMEOUT_MS = readPositiveIntEnv("SMTP_CONNECT_TIMEOUT_MS", 4500);
const SMTP_MAX_MX_HOSTS = readPositiveIntEnv("SMTP_MAX_MX_HOSTS", 3);
const SMTP_CHECK_ENABLED = readBooleanEnv("SMTP_CHECK_ENABLED", process.env.VERCEL !== "1");

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
    return {
      status: "failed",
      note: "Email domain does not match the selected company.",
      lastVerifiedAt: null
    };
  }

  const mailHosts = await resolveMailHostsForDomain(emailDomain);
  if (mailHosts.status === "none") {
    return {
      status: "failed",
      note: "Email domain has no MX records.",
      lastVerifiedAt: null
    };
  }

  if (!SMTP_CHECK_ENABLED) {
    return {
      status: "verified",
      note: "Domain verified, mailbox unconfirmed.",
      lastVerifiedAt: new Date()
    };
  }

  const smtpResult = await runWithDomainRateLimit(emailDomain, async () =>
    verifyMailboxAcrossHosts(mailHosts.hosts, normalizedEmail)
  );

  switch (smtpResult) {
    case "confirmed":
      return {
        status: "verified",
        note: "Domain and mailbox verified.",
        lastVerifiedAt: new Date()
      };
    case "rejected":
      return {
        status: "failed",
        note: "Mailbox does not exist at this domain.",
        lastVerifiedAt: null
      };
    case "unconfirmed":
      return {
        status: "verified",
        note: "Domain verified, mailbox unconfirmed.",
        lastVerifiedAt: new Date()
      };
    case "error":
    default:
      return {
        status: "verified",
        note: "Domain verified, mailbox unconfirmed.",
        lastVerifiedAt: new Date()
      };
  }
}
