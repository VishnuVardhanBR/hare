import assert from "node:assert/strict";
import test from "node:test";

import { getRenderableLogoCompanies } from "./logoMarqueeUtils";

test("getRenderableLogoCompanies keeps only entries with usable logo urls", () => {
  const input = [
    { id: "1", name: "A", logoUrl: "https://cdn.example.com/a.svg" },
    { id: "2", name: "B", logoUrl: null },
    { id: "3", name: "C", logoUrl: "" },
    { id: "4", name: "D", logoUrl: "   " },
    { id: "5", name: "E", logoUrl: "https://cdn.example.com/e.png" }
  ];

  const output = getRenderableLogoCompanies(input);

  assert.deepEqual(output, [
    { id: "1", name: "A", logoUrl: "https://cdn.example.com/a.svg" },
    { id: "5", name: "E", logoUrl: "https://cdn.example.com/e.png" }
  ]);
});
