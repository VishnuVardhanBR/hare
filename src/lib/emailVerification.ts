import { resolveMx } from "node:dns/promises";
import net from "node:net";

import {
  domainLikelyMatchesCompany,
  getDomainFromEmail,
  sanitizeDomain
} from "@/lib/company";

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com"
]);

const smtpLastCheckByDomain = new Map<string, number>();
const SMTP_MIN_INTERVAL_MS = 5000;
const SMTP_CONNECT_TIMEOUT_MS = 3500;

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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function waitForDomainRateLimit(domain: string): Promise<void> {
  const lastCheck = smtpLastCheckByDomain.get(domain);
  if (!lastCheck) {
    smtpLastCheckByDomain.set(domain, Date.now());
    return;
  }

  const elapsed = Date.now() - lastCheck;
  if (elapsed < SMTP_MIN_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, SMTP_MIN_INTERVAL_MS - elapsed)
    );
  }

  smtpLastCheckByDomain.set(domain, Date.now());
}

type SmtpResult = "confirmed" | "unconfirmed" | "rejected" | "error";

async function verifyMailboxViaSMTP(mxHost: string, email: string): Promise<SmtpResult> {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, mxHost);
    let stage: "greeting" | "ehlo" | "mailfrom" | "rcptto" | "done" = "greeting";
    let buffer = "";

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

    socket.setTimeout(SMTP_CONNECT_TIMEOUT_MS);
    socket.once("timeout", () => finish("error"));
    socket.once("error", () => finish("error"));

    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\r\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.substring(0, 3), 10);
        // Multi-line responses have a dash after the code; wait for final line
        if (line[3] === "-") continue;

        switch (stage) {
          case "greeting":
            if (code === 220) {
              stage = "ehlo";
              socket.write("EHLO hare.local\r\n");
            } else {
              finish("error");
            }
            break;
          case "ehlo":
            if (code === 250) {
              stage = "mailfrom";
              socket.write("MAIL FROM:<>\r\n");
            } else {
              finish("error");
            }
            break;
          case "mailfrom":
            if (code === 250) {
              stage = "rcptto";
              socket.write(`RCPT TO:<${email}>\r\n`);
            } else {
              finish("error");
            }
            break;
          case "rcptto":
            if (code === 250) {
              finish("confirmed");
            } else if (code >= 550 && code <= 553) {
              finish("rejected");
            } else {
              // 252, 450, 451, etc. — server won't confirm either way
              finish("unconfirmed");
            }
            break;
        }
      }
    });
  });
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
  const normalizedKnownDomains = knownDomains.map(sanitizeDomain);

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

  let mxRecords;
  try {
    mxRecords = await resolveMx(emailDomain);
  } catch {
    return {
      status: "failed",
      note: "Email domain has no MX records.",
      lastVerifiedAt: null
    };
  }

  if (!mxRecords.length) {
    return {
      status: "failed",
      note: "Email domain has no MX records.",
      lastVerifiedAt: null
    };
  }

  await waitForDomainRateLimit(emailDomain);

  const mxHost = mxRecords
    .sort((a, b) => a.priority - b.priority)
    .at(0)?.exchange;

  if (!mxHost) {
    return {
      status: "verified",
      note: "Domain verified, mailbox unconfirmed.",
      lastVerifiedAt: new Date()
    };
  }

  const smtpResult = await verifyMailboxViaSMTP(mxHost, normalizedEmail);

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
        note: "Domain verified, mailbox unconfirmed (SMTP unreachable from server).",
        lastVerifiedAt: new Date()
      };
  }
}
