import assert from "node:assert/strict";
import test from "node:test";
import { assignVariant } from "../src/creator_experiment.js";

const config = {
  experiment: "delivery-processing-v1",
  allocationPercent: 50,
  salt: "clinic-grade-stable-salt-2026",
};

test("the same creator remains in one delivery variant", () => {
  const first = assignVariant("creator_1042", config);
  const repeated = Array.from({ length: 20 }, () => assignVariant("creator_1042", config));
  assert.ok(repeated.every((variant) => variant === first));
});

test("allocation boundaries select the expected business path", () => {
  const controlOnly = { experiment: config.experiment, allocationPercent: 0, salt: config.salt };
  const treatmentOnly = { experiment: config.experiment, allocationPercent: 100, salt: config.salt };
  assert.equal(assignVariant("creator_1042", controlOnly), "control");
  assert.equal(assignVariant("creator_1042", treatmentOnly), "treatment");
});
