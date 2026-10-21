import test from "node:test";
import assert from "node:assert/strict";
import {
  applyChanges,
  createInitialState,
  loadState,
  selectPreview,
  selectVehicle,
  serializeState,
} from "../src/state.js";
import {
  claimChallenge,
  clubProgress,
  decodeBuild,
  deleteShowBuild,
  earnedCredits,
  eligibleChallenges,
  encodeBuild,
  fitPerformance,
  MAX_SAVED_BUILDS,
  normaliseClub,
  performanceRatings,
  saveShowBuild,
} from "../src/club.js";

const fitted = () => applyChanges(createInitialState()).state;
const saved = (state = fitted(), name = "Sunday special", id = "first") =>
  saveShowBuild(state, name, id);

test("a named build snapshots fitted appearance and performance, never an unpaid preview", () => {
  const initial = createInitialState();
  assert.equal(saveShowBuild(initial, "Unpaid").status, "fit-first");
  const s = selectPreview(fitted(), { paint: "mint" });
  const result = saved(s);
  assert.equal(result.status, "saved");
  assert.equal(result.build.selection.paint, "blue");
  assert.equal(result.state.balance, s.balance);
  assert.equal(s.club.builds.length, 0);
  assert.equal(saved(s, " \n ").status, "name-required");
  const changed = fitPerformance(result.state, "filter", "panel").state;
  assert.equal(result.build.spec.filter, "stock");
  assert.equal(
    saved(changed, "Panel daily", "second").build.spec.filter,
    "panel",
  );
});

test("repeat saves rename a build without farming collection entries; removal is independent of rewards", () => {
  const first = saved();
  const second = saved(first.state, "Renamed", "second");
  assert.equal(second.status, "updated");
  assert.equal(second.state.club.builds.length, 1);
  assert.equal(second.build.id, "first");
  const reward = claimChallenge(second.state, "sti:first-build", "first");
  const removed = deleteShowBuild(reward.state, "first");
  assert.equal(removed.club.builds.length, 0);
  assert.deepEqual(removed.club.completed, ["sti:first-build"]);
  assert.deepEqual(removed.garage, reward.state.garage);
  assert.equal(removed.balance, reward.state.balance);
});

test("brief rewards are atomic, one-time per car and persist above the starting balance", () => {
  const first = saved();
  assert.deepEqual(
    eligibleChallenges(first.state, first.build.id).map((c) => c.key),
    ["sti:first-build"],
  );
  const claimed = claimChallenge(
    first.state,
    "sti:first-build",
    first.build.id,
  );
  assert.equal(claimed.awarded, 1500);
  assert.equal(claimed.state.balance, first.state.balance + 1500);
  assert.equal(
    claimChallenge(claimed.state, "sti:first-build", first.build.id).awarded,
    0,
  );
  assert.equal(
    claimChallenge(first.state, "porsche:first-build", first.build.id).awarded,
    0,
  );
  assert.equal(
    claimChallenge(first.state, "sti:track-day", first.build.id).awarded,
    0,
  );
  assert.equal(earnedCredits(claimed.state.club), 1500);
  assert.equal(clubProgress(claimed.state.club).xp, 100);
  const highBalance = { ...claimed.state, balance: 48320 + 1500 };
  assert.equal(loadState(serializeState(highBalance)).balance, 49820);
  assert.equal(loadState({ ...highBalance, balance: 49821 }).balance, 48320);
  assert.equal(
    loadState(serializeState(claimed.state)).club.completed.length,
    1,
  );
});

test("performance parts charge once per vehicle, refit free, reject insufficient funds and preserve exterior previews", () => {
  const start = selectPreview(fitted(), { paint: "mint" });
  const result = fitPerformance(start, "filter", "panel");
  assert.equal(result.charged, 450);
  assert.equal(result.state.balance, start.balance - 450);
  assert.deepEqual(result.state.preview, start.preview);
  assert.equal(fitPerformance(result.state, "filter", "panel").charged, 0);
  const stock = fitPerformance(result.state, "filter", "stock");
  assert.equal(stock.charged, 0);
  assert.equal(fitPerformance(stock.state, "filter", "panel").charged, 0);
  const otherCar = selectVehicle(result.state, "porsche");
  assert.equal(fitPerformance(otherCar, "filter", "panel").charged, 450);
  const poor = { ...start, balance: 1 };
  assert.equal(
    fitPerformance(poor, "exhaust", "catback").status,
    "insufficient-funds",
  );
  assert.deepEqual(fitPerformance(poor, "exhaust", "catback").state, poor);
  assert.throws(() => fitPerformance(start, "filter", "imaginary"), RangeError);
  assert.deepEqual(
    performanceRatings({ filter: "panel", exhaust: "catback", tune: "track" }),
    { power: 68, response: 68, sound: 50 },
  );
});

test("a daily build needs fitted performance and matching saved exterior, not current previews", () => {
  let s = applyChanges(
    selectPreview(createInitialState(), { suspension: "sport" }),
  ).state;
  s = fitPerformance(s, "filter", "panel").state;
  const good = saved(s, "Daily", "daily");
  assert.ok(
    eligibleChallenges(good.state, "daily").some(
      (c) => c.key === "sti:clean-daily",
    ),
  );
  const changed = fitPerformance(good.state, "filter", "stock").state;
  assert.ok(
    eligibleChallenges(changed, "daily").some(
      (c) => c.key === "sti:clean-daily",
    ),
    "Earlier saved recipes remain valid",
  );
  const preview = selectPreview(fitted(), { suspension: "sport" });
  const bad = saved(preview);
  assert.ok(
    !eligibleChallenges(bad.state, bad.build.id).some(
      (c) => c.key === "sti:clean-daily",
    ),
  );
});

test("build codes round-trip Unicode safely and transfer neither ownership nor reward state", () => {
  const build = saved(fitted(), "Café 🚗 <script>").build;
  const code = encodeBuild({
    ...build,
    balance: 9000000,
    purchased: ["all"],
    completed: ["all"],
  });
  const decoded = decodeBuild(code);
  assert.equal(decoded.name, "Café 🚗 <script>");
  assert.equal(decoded.vehicle, "sti");
  assert.ok(!Object.hasOwn(decoded, "balance"));
  assert.ok(!Object.hasOwn(decoded, "purchased"));
  assert.ok(!Object.hasOwn(decoded, "completed"));
  assert.ok(!Object.hasOwn(decoded, "id"));
  for (const invalid of [
    "",
    "https://evil.test",
    "SR1.***",
    "SR1." + "a".repeat(16001),
    code.slice(0, 12),
  ])
    assert.throws(() => decodeBuild(invalid));
  assert.throws(() => encodeBuild({ ...build, vehicle: "missing" }));
  assert.throws(() =>
    encodeBuild({
      ...build,
      selection: { ...build.selection, wheel: "missing" },
    }),
  );
  assert.throws(() =>
    encodeBuild({ ...build, spec: { ...build.spec, tune: "missing" } }),
  );
});

test("club normalisation safely migrates older saves and excludes unknown receipts, malformed builds and duplicate rewards", () => {
  const old = createInitialState();
  delete old.club;
  assert.deepEqual(loadState(old).club, normaliseClub());
  const b = saved().build;
  const club = normaliseClub({
    builds: [b, b, { ...b, id: "../../escape" }, { id: "bad" }],
    completed: ["sti:first-build", "sti:first-build", "unknown"],
    region: "bad",
    performance: {
      sti: {
        fitted: { filter: "intake" },
        owned: [
          "bad",
          {},
          "filter:panel",
          "filter:panel",
          "filter:intake:extra",
          "__proto__:missing",
          "constructor:missing",
        ],
      },
    },
  });
  assert.equal(club.builds.length, 1);
  assert.deepEqual(club.completed, ["sti:first-build"]);
  assert.equal(club.region, "global");
  assert.equal(club.performance.sti.fitted.filter, "stock");
  assert.deepEqual(club.performance.sti.owned, ["filter:panel"]);
  assert.equal(MAX_SAVED_BUILDS, 24);
});
