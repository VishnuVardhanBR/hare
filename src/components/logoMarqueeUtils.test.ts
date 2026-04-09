import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLogoDevUrl,
  getRenderableLogoCompanies
} from "./logoMarqueeUtils";

test("buildLogoDevUrl builds logo.dev URL with strict 404 fallback", () => {
  const url = buildLogoDevUrl("salesforce.com", "pk_test_123");

  assert.equal(
    url,
    "https://img.logo.dev/salesforce.com?token=pk_test_123&size=128&format=png&fallback=404"
  );
});

test("buildLogoDevUrl sanitizes url-like domains", () => {
  const url = buildLogoDevUrl("  https://www.stripe.com/path  ", "pk_test_123");

  assert.equal(
    url,
    "https://img.logo.dev/stripe.com?token=pk_test_123&size=128&format=png&fallback=404"
  );
});

test("buildLogoDevUrl returns null when token or domain is missing", () => {
  assert.equal(buildLogoDevUrl("apple.com", ""), null);
  assert.equal(buildLogoDevUrl("", "pk_test_123"), null);
});

test("getRenderableLogoCompanies maps domain rows to logo.dev logo urls", () => {
  const input = [
    { id: "1", name: "A", domain: "a.com" },
    { id: "2", name: "B", domain: null },
    { id: "3", name: "C", domain: "   " },
    { id: "4", name: "D", domain: "https://www.d.com/path" }
  ];

  const output = getRenderableLogoCompanies(input, "pk_test_123");

  assert.deepEqual(output, [
    {
      id: "1",
      name: "A",
      logoUrl: "https://img.logo.dev/a.com?token=pk_test_123&size=128&format=png&fallback=404"
    },
    {
      id: "4",
      name: "D",
      logoUrl: "https://img.logo.dev/d.com?token=pk_test_123&size=128&format=png&fallback=404"
    }
  ]);
});
