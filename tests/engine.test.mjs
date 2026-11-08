import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CATEGORIES,
  createDeck,
  eligibleQuestions,
  points,
  questionResult,
  totals,
  validateBank,
} from "../engine.js";
const bank = JSON.parse(
  readFileSync(new URL("../questions.json", import.meta.url)),
);
const config = {
  categories: Object.keys(CATEGORIES),
  levels: [1, 2, 3],
  pool: "all",
  length: "all",
};
test("all 216 questions have complete, unique, valid content", () => {
  validateBank(bank);
  assert.equal(bank.length, 216);
  assert.equal(new Set(bank.map((q) => q.prompt)).size, 216);
  for (const cat of config.categories)
    assert.equal(bank.filter((q) => q.category === cat).length, 36);
});
test("full tour includes every question once and permutes all choices", () => {
  const deck = createDeck(bank, config);
  assert.equal(deck.length, 216);
  assert.equal(new Set(deck.map((q) => q.id)).size, 216);
  for (const q of deck) assert.deepEqual([...q.order].sort(), [0, 1, 2, 3]);
});
test("balanced rounds visit all selected subjects before any repeats", () => {
  const deck = createDeck(bank, config);
  for (let i = 0; i < deck.length; i += config.categories.length)
    assert.equal(
      new Set(
        deck
          .slice(i, i + config.categories.length)
          .map((d) => bank.find((q) => q.id === d.id).category),
      ).size,
      config.categories.length,
    );
});
test("category and difficulty filters are applied before selection", () => {
  const c = { ...config, categories: ["math", "bio"], levels: [2], length: 10 };
  const deck = createDeck(bank, c);
  assert.equal(deck.length, 10);
  for (const item of deck) {
    const q = bank.find((q) => q.id === item.id);
    assert.ok(c.categories.includes(q.category));
    assert.equal(q.level, 2);
  }
});
test("probability puzzles can be selected as a standalone category", () => {
  const deck = createDeck(bank, { ...config, categories: ["probability"] });
  assert.equal(deck.length, 36);
  assert.ok(
    deck.every(
      (item) => bank.find((q) => q.id === item.id).category === "probability",
    ),
  );
});
test("a bookmark alone does not mark a question as explored", () => {
  const progress = {
    [bank[0].id]: { saved: true },
    [bank[1].id]: { attempts: 1 },
  };
  const qs = eligibleQuestions(bank, { ...config, pool: "unseen" }, progress);
  assert.ok(qs.some((q) => q.id === bank[0].id));
  assert.ok(!qs.some((q) => q.id === bank[1].id));
  assert.equal(qs.length, bank.length - 1);
});
test("missed and bookmarked pools are independent", () => {
  const p = {
    [bank[0].id]: { saved: true, attempts: 1, missed: false },
    [bank[1].id]: { attempts: 1, missed: true },
  };
  assert.deepEqual(
    eligibleQuestions(bank, { ...config, pool: "saved" }, p).map((q) => q.id),
    [bank[0].id],
  );
  assert.deepEqual(
    eligibleQuestions(bank, { ...config, pool: "missed" }, p).map((q) => q.id),
    [bank[1].id],
  );
});
test("empty pools give an empty deck, short pools do not repeat", () => {
  assert.deepEqual(createDeck(bank, { ...config, categories: [] }), []);
  assert.deepEqual(createDeck(bank, { ...config, pool: "missed" }), []);
  const p = { [bank[0].id]: { saved: true } };
  assert.equal(
    createDeck(bank, { ...config, pool: "saved", length: 50 }, p).length,
    1,
  );
});
test("unseen questions are preferred within each subject", () => {
  const p = Object.fromEntries(bank.map((q) => [q.id, { attempts: 1 }]));
  const fresh = bank.find((q) => q.category === "math");
  delete p[fresh.id];
  const deck = createDeck(
    bank,
    { ...config, categories: ["math"], length: 10 },
    p,
  );
  assert.equal(deck[0].id, fresh.id);
});
test("scoring matches the published rules including hint overriding confidence", () => {
  assert.equal(points(true, false, false), 100);
  assert.equal(points(true, true, false), 150);
  assert.equal(points(false, true, false), -30);
  assert.equal(points(false, false, false), 0);
  assert.equal(points(true, false, true), 60);
  assert.equal(points(true, true, true), 60);
  assert.equal(points(false, true, true), 0);
});
test("two players score independently and a pass is wrong", () => {
  const q = bank[0];
  const results = questionResult(q, [
    { choice: q.answer, confident: true, hint: false },
    { choice: -1, confident: false, hint: false },
  ]);
  assert.deepEqual(
    results.map((r) => r.points),
    [150, 0],
  );
  assert.deepEqual(totals([{ results }], 2), [
    { points: 150, correct: 1 },
    { points: 0, correct: 0 },
  ]);
});
test("malformed question data fails explicitly", () => {
  assert.throws(
    () => validateBank([{ ...bank[0], answer: 7 }]),
    /Invalid answer/,
  );
  assert.throws(() => validateBank([bank[0], bank[0]]), /Duplicate/);
  assert.throws(
    () =>
      validateBank([
        { ...bank[0], source: { title: "unsafe", url: "javascript:alert(1)" } },
      ]),
    /Missing source/,
  );
});
