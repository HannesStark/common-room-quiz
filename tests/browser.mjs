import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const bank = JSON.parse(
  readFileSync(new URL("../questions.json", import.meta.url)),
);
const byId = Object.fromEntries(bank.map((q) => [q.id, q]));
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.QUIZ_URL || "http://127.0.0.1:4387";
const output = process.env.QA_DIR || "/tmp/common-room-qa";
mkdirSync(output, { recursive: true });
const getState = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("common-room-v1")));
async function click(action) {
  await page.locator(`[data-action="${action}"]`).first().click();
}
async function noOverflow() {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
}
try {
  await page.goto(base);
  await page.locator("#start-button").waitFor();
  assert.match(await page.textContent(".hero-facts"), /180/);
  await page.screenshot({ path: output + "/home.png", fullPage: true });
  await page
    .locator("label.mode-option")
    .filter({ has: page.locator('[value="duel"]') })
    .click();
  await page.locator("#name-one").fill("Ada");
  await page.locator("#name-two").fill("Rosalind");
  await page.locator("#length").selectOption("10");
  await page.locator("#difficulty").selectOption("all");
  await click("start");
  assert.equal((await getState()).session.mode, "duel");
  assert.equal(await page.locator(".answer-options button").count(), 4);
  assert.equal(await page.locator("#lock-button").isDisabled(), true);
  const expected = [0, 0];
  for (let i = 0; i < 10; i++) {
    let s = (await getState()).session;
    const q = byId[s.deck[i].id];
    assert.equal(s.turn, i % 2);
    for (let turn = 0; turn < 2; turn++) {
      s = (await getState()).session;
      const player = s.turn;
      let choice = q.answer;
      if (i === 0 && player === 0) {
        await click("hint");
        assert.equal(await page.locator("#confident").isDisabled(), true);
        expected[player] += 60;
        await click("bookmark");
      } else if (i === 0 && player === 1) {
        choice = (q.answer + 1) % 4;
        await page.locator("#confident").check();
        expected[player] -= 30;
      } else expected[player] += 100;
      await page.locator(`[data-choice="${choice}"]`).click();
      if (i === 0 && turn === 0) {
        await page.keyboard.press("Enter");
      } else await click("lock");
      if (turn === 0) {
        assert.equal(await page.locator(".reveal-panel").count(), 0);
        assert.equal(await page.locator(".answer-options").count(), 0);
        assert.equal((await getState()).session.step, "handoff");
        if (i === 0) {
          await page.reload();
          await click("resume");
          assert.equal((await getState()).session.step, "handoff");
          assert.equal(await page.locator(".answer-options").count(), 0);
        }
        await click("ready");
      }
    }
    assert.equal((await getState()).session.step, "reveal");
    assert.equal(await page.locator(".answer-option.correct").count(), 1);
    if (i === 0) {
      await page.screenshot({ path: output + "/reveal.png", fullPage: true });
      await page.reload();
      await click("resume");
      assert.equal((await getState()).session.history.length, 1);
    }
    await click("next");
  }
  assert.equal((await getState()).session.step, "end");
  const final = (await getState()).session;
  assert.deepEqual(
    final.history.reduce(
      (s, h) => s.map((v, i) => v + h.results[i].points),
      [0, 0],
    ),
    expected,
  );
  assert.deepEqual(expected, [960, 870]);
  await page.screenshot({ path: output + "/results.png", fullPage: true });
  await click("retry-round");
  assert.equal((await getState()).session.deck.length, 1);
  await click("home");
  await page
    .locator("label.mode-option")
    .filter({ has: page.locator('[value="coop"]') })
    .click();
  await page.locator("#pool").selectOption("saved");
  await click("start");
  assert.equal((await getState()).session.deck.length, 1);
  assert.equal((await getState()).session.mode, "coop");
  assert.equal((await getState()).session.answers.length, 1);
  await page.keyboard.press("2");
  assert.notEqual((await getState()).session.selected, null);
  await page.keyboard.press("Enter");
  assert.equal((await getState()).session.step, "reveal");
  await click("next");
  assert.equal((await getState()).session.step, "end");
  await click("home");
  await page.locator("#library-link").click();
  assert.equal(await page.locator("#modal .library>details").count(), 180);
  assert.equal(await page.locator("#modal .library-answer[open]").count(), 0);
  await page.locator('[data-filter="law"]').click();
  assert.equal(await page.locator("#modal .library>details").count(), 36);
  await page
    .locator("#modal .library>details")
    .first()
    .locator("summary")
    .first()
    .click();
  assert.equal(await page.locator("#modal .library-answer[open]").count(), 0);
  await page.keyboard.press("Escape");
  await page.locator("#about-link").click();
  assert.match(await page.textContent("#modal-body"), /CC BY-NC-SA 4.0/);
  await page.keyboard.press("Escape");
  await page.locator("#pool").selectOption("all");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await noOverflow();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: output + "/mobile-home.png", fullPage: true });
  await click("start");
  await noOverflow();
  await page.screenshot({
    path: output + "/mobile-question.png",
    fullPage: true,
  });
  await click("hint");
  await noOverflow();
  await click("skip");
  await noOverflow();
  // Re-enter from a corrupt saved session instead of getting stuck on loading.
  await page.evaluate(() =>
    localStorage.setItem(
      "common-room-v1",
      JSON.stringify({ version: 1, session: { step: "question", deck: [] } }),
    ),
  );
  await page.reload();
  await page.locator("#start-button").waitFor();
  assert.equal((await getState()).session, null);
  // A complete solo tour also exercises every card and every round interlude.
  await page
    .locator("label.mode-option")
    .filter({ has: page.locator('[value="solo"]') })
    .click();
  await page.locator("#length").selectOption("all");
  await page.locator("#difficulty").selectOption("all");
  await click("start");
  assert.equal((await getState()).session.deck.length, 180);
  for (let i = 0; i < 180; i++) {
    assert.equal(await page.locator(".answer-options button").count(), 4);
    await noOverflow();
    await page.evaluate(() =>
      document.querySelector('[data-action="skip"]').click(),
    );
    await page.evaluate(() =>
      document.querySelector('[data-action="next"]').click(),
    );
    if ((i + 1) % 10 === 0 && i < 179) {
      assert.equal((await getState()).session.step, "break");
      await page.evaluate(() =>
        document.querySelector('[data-action="ready"]').click(),
      );
    }
  }
  assert.equal((await getState()).session.step, "end");
  assert.equal((await getState()).session.history.length, 180);
  await click("home");
  await page.locator("#pool").selectOption("unseen");
  assert.equal(await page.locator("#start-button").isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "duel scoring",
        "hidden handoff",
        "refresh resume",
        "no duplicate scores",
        "alternating first player",
        "hint rules",
        "bookmarks",
        "retry missed",
        "cooperative play",
        "keyboard control",
        "spoiler-safe library",
        "source credits",
        "320px and 390px layouts",
        "corrupt-save recovery",
        "complete 180-question solo tour",
        "all round interludes",
        "exhausted unseen pool",
      ],
      scores: expected,
    }),
  );
} finally {
  await browser.close();
}
