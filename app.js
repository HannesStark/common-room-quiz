import {
  CATEGORIES,
  LEVELS,
  eligibleQuestions,
  createDeck,
  questionResult,
  totals,
  validateBank,
} from "./engine.js";

const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const KEY = "common-room-v1";
const e = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const defaultConfig = {
  mode: "coop",
  length: 25,
  levels: [1, 2],
  categories: Object.keys(CATEGORIES),
  pool: "all",
  names: ["Player 1", "Player 2"],
};
let state = {
  config: structuredClone(defaultConfig),
  progress: {},
  session: null,
};
let bank = [],
  byId = {},
  screen = "home",
  libraryFilter = "all";
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && saved.version === 1) {
    state.progress =
      saved.progress &&
      typeof saved.progress === "object" &&
      !Array.isArray(saved.progress)
        ? saved.progress
        : {};
    state.session = saved.session;
    state.config = { ...defaultConfig, ...saved.config };
  }
} catch {
  /* A corrupt or unavailable save does not prevent play. */
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, version: 1 }));
  } catch {
    storageAvailable = false;
    document.querySelector("#save-status").textContent =
      "Browser storage is unavailable. Keep this tab open to keep playing.";
  }
}
let toastTimer;
function toast(message) {
  document.querySelector("#toast").textContent = message;
  document.querySelector("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => document.querySelector("#toast").classList.remove("visible"),
    2600,
  );
}
function showModal(content) {
  document.querySelector("#modal-body").innerHTML = content;
  modal.showModal();
}
function closeModal() {
  modal.close();
}
document.querySelector("#close-modal").onclick = closeModal;
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    const r = modal.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      closeModal();
  }
});
function moveFocus() {
  document.querySelector("#screen-title")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}
function openHome() {
  screen = "home";
  renderHome();
  moveFocus();
}
document.querySelector("#brand").onclick = (ev) => {
  ev.preventDefault();
  openHome();
};
document.querySelector("#library-link").onclick = () => openLibrary();
document.querySelector("#about-link").onclick = showAbout;
document.querySelector("#footer-about").onclick = showAbout;

function counts() {
  return {
    seen: bank.filter((q) => state.progress[q.id]?.attempts).length,
    saved: bank.filter((q) => state.progress[q.id]?.saved).length,
    missed: bank.filter((q) => state.progress[q.id]?.missed).length,
  };
}
function sessionNames(s) {
  return s.mode === "duel"
    ? s.names
    : [s.mode === "coop" ? "The team" : s.names[0]];
}
function renderHome() {
  const c = state.config,
    n = counts(),
    active = state.session && state.session.step !== "end";
  app.innerHTML = `<section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> FOR THE JOY OF FIGURING IT OUT</div><h1 id="screen-title" tabindex="-1">A little knowledge.<br>A lot to <em>argue about.</em></h1><p class="hero-description">A quiz night for curious minds. Six subjects, satisfying puzzles, and the occasional very confident wrong answer.</p><div class="hero-facts"><span><strong>${bank.length}</strong> questions</span><span><strong>${Object.keys(CATEGORIES).length}</strong> rabbit holes</span><span><strong>Zero</strong> time pressure</span></div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><span class="art-center">what<br><i>if?</i></span><span class="art-chip chip-math">x + y</span><span class="art-chip chip-bio">A T G C</span><span class="art-chip chip-cs">if (curious)</span><span class="art-chip chip-law">it depends.</span><span class="art-small">BRING YOUR BEST GUESS.</span></div></section>
  ${active ? `<section class="resume-banner"><div><strong>Your table is still here.</strong><span>${state.session.history.length} of ${state.session.deck.length} questions answered. ${state.session.mode === "duel" ? "The rivalry continues." : "Pick up where you left off."}</span></div><button class="button dark" data-action="resume">Continue playing <span aria-hidden="true">&rarr;</span></button></section>` : ""}
  <section class="setup-section"><div class="section-intro"><div><div class="eyebrow">01 / SET THE TABLE</div><h2>Your kind of quiz night.</h2></div><span class="small-note">${n.seen} / ${bank.length} explored</span></div>
  <div class="setup-grid"><div class="setup-main"><fieldset><legend>Who is playing?</legend><div class="mode-options">${[
    ["coop", "Together", "One answer. Two brains."],
    ["duel", "Friendly rivalry", "Two answers. One reveal."],
    ["solo", "Just me", "Follow your curiosity."],
  ]
    .map(
      ([v, t, d]) =>
        `<label class="mode-option"><input type="radio" name="mode" value="${v}" ${c.mode === v ? "checked" : ""}><span><strong>${t}</strong><small>${d}</small></span></label>`,
    )
    .join("")}</div></fieldset>
  <div id="names" class="name-fields" ${c.mode === "coop" ? "hidden" : ""}><label>${c.mode === "solo" ? "Your name" : "Player 1"}<input id="name-one" maxlength="24" value="${e(c.names[0])}" autocomplete="off"></label><label id="second-name" ${c.mode !== "duel" ? "hidden" : ""}>Player 2<input id="name-two" maxlength="24" value="${e(c.names[1])}" autocomplete="off"></label></div>
  <fieldset class="subjects"><legend>Choose your rabbit holes <span>Mix freely.</span></legend><div class="subject-options">${Object.entries(
    CATEGORIES,
  )
    .map(
      ([key, v]) =>
        `<label class="subject-option" style="--subject:${v.color}"><input type="checkbox" name="category" value="${key}" ${c.categories.includes(key) ? "checked" : ""}><span class="subject-number">${v.number}</span><span><strong>${v.name}</strong><small>${v.description}</small></span><span class="check-mark" aria-hidden="true"></span></label>`,
    )
    .join("")}</div></fieldset></div>
  <aside class="setup-side"><label class="field-label" for="length">How long are we staying?</label><select id="length">${[
    [10, "A quick visit / 10 questions"],
    [25, "Make an evening of it / 25"],
    [50, "Settle in / 50 questions"],
    ["all", "The full tour / all in this mix"],
  ]
    .map(
      ([v, t]) =>
        `<option value="${v}" ${String(c.length) === String(v) ? "selected" : ""}>${t}</option>`,
    )
    .join(
      "",
    )}</select><p class="field-help">Allow roughly 1-3 minutes per question, plus the discussion.</p>
  <label class="field-label" for="difficulty">How much head-scratching?</label><select id="difficulty"><option value="balanced" ${!c.levels.includes(3) ? "selected" : ""}>A good challenge</option><option value="all" ${c.levels.length === 3 ? "selected" : ""}>A little of everything</option><option value="stretch" ${c.levels.length === 2 && c.levels.includes(3) ? "selected" : ""}>Turn it up a notch</option></select><p class="field-help">Default: insight and short reasoning. Stretch questions are optional.</p>
  <label class="field-label" for="pool">Which questions?</label><select id="pool">${[
    ["all", "All questions / new ones first"],
    ["unseen", "Only unexplored questions"],
    ["missed", `Second chances / ${n.missed} to revisit`],
    ["saved", `Bookmarked / ${n.saved} questions`],
  ]
    .map(
      ([v, t]) =>
        `<option value="${v}" ${c.pool === v ? "selected" : ""}>${t}</option>`,
    )
    .join("")}</select>
  <div class="start-block"><p id="available-count"></p><button class="button yellow full" data-action="start" id="start-button">Let's play <span aria-hidden="true">&rarr;</span></button><span class="start-note">No account. No timer. Hints welcome.</span></div></aside></div></section>
  <section class="how-it-works"><div class="eyebrow">A FEW HOUSE RULES</div><div class="how-grid"><div><span>01</span><h3>Think out loud.</h3><p>Work through little puzzles, predict an experiment, or find the flaw in an argument.</p></div><div><span>02</span><h3>Commit, then compare.</h3><p>In rivalry mode, pass control after locking in. Look away while the other player chooses.</p></div><div><span>03</span><h3>Leave a little wiser.</h3><p>Every question has a hint, an explanation, and a link to the course behind the idea.</p></div></div></section>`;
  updateAvailability();
}
function readConfig() {
  const mode =
    document.querySelector('input[name="mode"]:checked')?.value || "coop";
  const difficulty = document.querySelector("#difficulty").value;
  state.config = {
    mode,
    length: document.querySelector("#length").value,
    levels:
      difficulty === "all"
        ? [1, 2, 3]
        : difficulty === "stretch"
          ? [2, 3]
          : [1, 2],
    categories: [
      ...document.querySelectorAll('input[name="category"]:checked'),
    ].map((x) => x.value),
    pool: document.querySelector("#pool").value,
    names: [
      document.querySelector("#name-one").value.trim() || "Player 1",
      document.querySelector("#name-two").value.trim() || "Player 2",
    ],
  };
  save();
}
function updateAvailability() {
  const eligible = eligibleQuestions(bank, state.config, state.progress).length;
  const chosen =
    state.config.length === "all"
      ? eligible
      : Math.min(eligible, Number(state.config.length));
  document.querySelector("#available-count").textContent = eligible
    ? `${chosen} questions on your menu. ${eligible} available.`
    : "No questions in this mix. Try another subject, difficulty, or pool.";
  document.querySelector("#start-button").disabled = !eligible;
}
app.addEventListener("change", (ev) => {
  if (screen !== "home") return;
  readConfig();
  if (ev.target.name === "mode") renderHome();
  else updateAvailability();
});
function startGame(force = false) {
  readConfig();
  if (
    !force &&
    state.session &&
    state.session.step !== "end" &&
    state.session.history.length
  ) {
    showModal(
      `<div class="eyebrow">A FRESH TABLE</div><h2 id="modal-title">Start a new game?</h2><p>Your explored questions and bookmarks will stay. This replaces the current round.</p><div class="button-row"><button class="button dark" data-action="new-confirm">Start new game</button><button class="button secondary" data-action="close">Keep current round</button></div>`,
    );
    return;
  }
  const deck = createDeck(bank, state.config, state.progress);
  if (!deck.length) return;
  const c = state.config;
  state.session = {
    v: 1,
    mode: c.mode,
    names: [...c.names],
    deck,
    index: 0,
    history: [],
    answers: c.mode === "duel" ? [null, null] : [null],
    step: "question",
    turn: 0,
    selected: null,
    confident: false,
    hint: false,
  };
  screen = "game";
  save();
  renderGame();
  moveFocus();
}
function scoreBar(s) {
  return `<div class="score-strip">${sessionNames(s)
    .map((n, i) => {
      const t = totals(s.history, s.answers.length)[i];
      return `<div class="score-player ${s.step === "question" && s.turn === i ? "active" : ""}"><span>${e(n)}</span><strong>${t.points}<small> pts</small></strong></div>`;
    })
    .join(
      "",
    )}<button class="text-button score-rules" data-action="scoring">Scoring</button></div>`;
}
function renderGame() {
  const s = state.session;
  if (!s) {
    openHome();
    return;
  }
  if (s.step === "end") {
    renderEnd();
    return;
  }
  if (s.step === "break") {
    renderBreak();
    return;
  }
  const q = byId[s.deck[s.index].id],
    cat = CATEGORIES[q.category],
    names = sessionNames(s),
    saved = state.progress[q.id]?.saved;
  const completed = s.history.length;
  app.innerHTML = `<section class="game-shell"><div class="game-toolbar"><button class="text-button" data-action="home">&larr; Save &amp; leave table</button><span>QUESTION ${s.index + 1} OF ${s.deck.length}</span><span>${Math.floor(s.index / 10) + 1}${s.deck.length > 10 ? " / " + Math.ceil(s.deck.length / 10) : ""} <span class="muted">ROUND</span></span></div><div class="progress-track" role="progressbar" aria-label="Questions completed" aria-valuemin="0" aria-valuemax="${s.deck.length}" aria-valuenow="${completed}"><div style="width:${(100 * completed) / s.deck.length}%"></div></div>${scoreBar(s)}
  ${
    s.step === "handoff"
      ? `<div class="handoff"><div class="handoff-icon" aria-hidden="true">&harr;</div><div class="eyebrow">ANSWER SAFELY LOCKED</div><h1 id="screen-title" tabindex="-1">Over to you,<br><em>${e(names[s.turn])}.</em></h1><p>Same question. Your own answer.<br>The other player should look away while you choose.</p><button class="button yellow" data-action="ready">I'm ready <span aria-hidden="true">&rarr;</span></button><p class="keyboard-tip">Press Enter when ready</p></div>`
      : `<article class="question-card"><div class="question-meta"><span class="category-tag" style="background:${cat.color}">${cat.name}</span><span class="level-tag">${LEVELS[q.level]}</span><span class="type-tag">${e(q.type || "Thought experiment")}</span><button class="bookmark ${saved ? "saved" : ""}" data-action="bookmark" aria-pressed="${Boolean(saved)}" aria-label="${saved ? "Remove bookmark" : "Bookmark question"}">${saved ? "Saved +" : "Save +"}</button></div><div class="question-heading"><div class="eyebrow">${s.mode === "duel" ? e(names[s.turn]) + "'S TURN" : s.mode === "coop" ? "PUT YOUR HEADS TOGETHER" : "TAKE YOUR TIME"}</div><h1 id="screen-title" tabindex="-1">${e(q.title)}</h1><p class="question-prompt">${e(q.prompt)}</p></div>
  <div class="answer-options" role="group" aria-label="Answer choices">${s.deck[
    s.index
  ].order
    .map((original, i) => {
      const revealed = s.step === "reveal",
        correct = original === q.answer,
        selected = s.selected === original;
      const picked = revealed
        ? s.history
            .at(-1)
            .results.flatMap((a, p) =>
              a.choice === original ? [names[p]] : [],
            )
        : [];
      return `<button class="answer-option ${!revealed && selected ? "selected" : ""} ${revealed && correct ? "correct" : ""} ${revealed && picked.length && !correct ? "incorrect" : ""}" data-action="choose" data-choice="${original}" aria-pressed="${!revealed && selected}" ${revealed ? "disabled" : ""}><span class="option-letter">${"ABCD"[i]}</span><span class="option-text">${e(q.options[original])}${revealed && picked.length ? `<small>${e(picked.join(" + "))}</small>` : ""}</span>${revealed && correct ? '<span class="answer-mark">Correct</span>' : ""}</button>`;
    })
    .join("")}</div>
  ${s.step === "reveal" ? renderReveal(s, q) : `<div class="question-tools"><button class="text-button hint-button" data-action="hint" ${s.hint ? "disabled" : ""}>${s.hint ? "Hint opened" : "A little nudge?"}</button><label class="confidence"><input type="checkbox" id="confident" ${s.confident ? "checked" : ""} ${s.hint ? "disabled" : ""}> Feeling confident <span title="Correct: 150 points. Wrong: -30. With a hint: 60 for correct, 0 for wrong.">(+50 / -30)</span></label></div>${s.hint ? `<aside class="hint-panel"><strong>A little nudge</strong><p>${e(q.hint)}</p><small>Correct answers are worth 60 points after a hint.</small></aside>` : ""}<div class="question-bottom"><button class="text-button" data-action="skip">Pass this one</button><span class="keyboard-tip">1-4 to choose &middot; Enter to lock</span><button class="button dark" data-action="lock" id="lock-button" ${s.selected === null ? "disabled" : ""}>${s.mode === "duel" ? "Lock my answer" : "Reveal answer"} <span aria-hidden="true">&rarr;</span></button></div>`}</article>`
  }</section>`;
  document.querySelector("#confident")?.addEventListener("change", (ev) => {
    s.confident = ev.target.checked;
    save();
  });
}
function renderReveal(s, q) {
  const h = s.history.at(-1),
    names = sessionNames(s),
    allRight = h.results.every((r) => r.correct);
  const title = allRight
    ? s.mode === "duel"
      ? "Great minds. Same answer."
      : "Nicely reasoned."
    : h.results.some((r) => r.correct)
      ? "A difference of opinion. Settled."
      : "A good one to take away.";
  return `<section class="reveal-panel ${allRight ? "all-right" : ""}" aria-label="Answer explanation"><div class="reveal-top"><h2>${title}</h2><div class="point-badges">${h.results.map((r, i) => `<span>${e(names[i])} <strong>${r.points >= 0 ? "+" : ""}${r.points}</strong></span>`).join("")}</div></div><p>${e(q.explanation)}</p><a class="source-link" href="${e(q.source.url)}" target="_blank" rel="noopener noreferrer">Explore the idea: ${e(q.source.title)} <span aria-hidden="true">&nearr;</span></a><p class="source-note">Original quiz question inspired by this course material.</p></section><div class="question-bottom"><button class="text-button" data-action="discuss">Something to discuss</button><span class="keyboard-tip">Enter to continue</span><button class="button yellow" data-action="next">${s.index === s.deck.length - 1 ? "See how we did" : "Next question"} <span aria-hidden="true">&rarr;</span></button></div>`;
}
function lockAnswer(pass = false) {
  const s = state.session;
  if (s?.step !== "question" || (!pass && s.selected === null)) return;
  const q = byId[s.deck[s.index].id];
  s.answers[s.turn] = {
    choice: pass ? -1 : s.selected,
    confident: pass ? false : s.confident,
    hint: s.hint,
  };
  if (s.mode === "duel" && s.answers.some((a) => a === null)) {
    s.turn = 1 - s.turn;
    s.step = "handoff";
    s.selected = null;
    s.confident = false;
    s.hint = false;
  } else {
    const results = questionResult(q, s.answers);
    s.history.push({ id: q.id, category: q.category, results });
    s.step = "reveal";
    const p = state.progress[q.id] || {};
    state.progress[q.id] = {
      ...p,
      attempts: (p.attempts || 0) + 1,
      missed: results.some((r) => !r.correct),
    };
  }
  save();
  renderGame();
  moveFocus();
}
function nextQuestion() {
  const s = state.session;
  if (s.step !== "reveal") return;
  if (s.index === s.deck.length - 1) {
    s.step = "end";
    save();
    renderEnd();
    moveFocus();
    return;
  }
  s.index++;
  s.answers = s.mode === "duel" ? [null, null] : [null];
  s.turn = s.mode === "duel" ? s.index % 2 : 0;
  s.selected = null;
  s.hint = false;
  s.confident = false;
  s.step = s.index % 10 === 0 ? "break" : "question";
  save();
  renderGame();
  moveFocus();
}
function renderBreak() {
  const s = state.session,
    t = totals(s.history, s.answers.length);
  app.innerHTML = `<section class="interlude"><div class="eyebrow">ROUND ${s.index / 10} COMPLETE</div><h1 id="screen-title" tabindex="-1">Time for a<br><em>tiny victory lap.</em></h1><p>${s.index} questions explored. ${s.deck.length - s.index} still to come.</p>${scoreBar(s)}<div class="conversation-card"><span class="eyebrow">BEFORE YOU GO ON</span><h3>${["Which answer surprised you most?", "Which idea would make a good experiment?", "What did you change your mind about?", "Which question would you ask a friend?"][(s.index / 10 - 1) % 4]}</h3><p>Take a sip. Compare notes. The quiz can wait.</p></div><button class="button yellow" data-action="ready">Back to the questions &rarr;</button><button class="text-button" data-action="home">Save the rest for later</button></section>`;
}
function renderEnd() {
  const s = state.session,
    names = sessionNames(s),
    ts = totals(s.history, s.answers.length),
    missed = s.history.filter((h) => h.results.some((r) => !r.correct));
  const winner =
    s.mode === "duel"
      ? ts[0].points === ts[1].points
        ? "A very civil tie."
        : `${names[ts[0].points > ts[1].points ? 0 : 1]} takes the round.`
      : "Curiosity wins.";
  app.innerHTML = `<section class="results"><div class="eyebrow">THAT WAS A GOOD CONVERSATION</div><h1 id="screen-title" tabindex="-1">${e(winner)}</h1><p class="results-subtitle">${s.history.length} questions. A few new things to think about.</p><div class="result-scores">${ts.map((t, i) => `<div><span>${e(names[i])}</span><strong>${t.points}<small> pts</small></strong><p>${t.correct} / ${s.history.length} correct &middot; ${Math.round((100 * t.correct) / s.history.length)}%</p></div>`).join("")}</div><div class="results-actions"><button class="button yellow" data-action="home">Another round &rarr;</button>${missed.length ? `<button class="button secondary" data-action="retry-round">Revisit ${missed.length} missed questions</button>` : ""}</div><h2>Your tour of the subjects</h2><div class="topic-results">${Object.entries(
    CATEGORIES,
  )
    .map(([key, c]) => {
      const hs = s.history.filter((h) => h.category === key);
      if (!hs.length) return "";
      return `<div class="topic-result"><span class="category-tag" style="background:${c.color}">${c.name}</span>${names
        .map((name, i) => {
          const right = hs.filter((h) => h.results[i].correct).length;
          return `<span>${names.length > 1 ? e(name) + ": " : ""}<strong>${right}/${hs.length}</strong></span>`;
        })
        .join("")}</div>`;
    })
    .join(
      "",
    )}</div><h2>Keep the good questions.</h2><div class="review-list">${s.history
    .map((h) => {
      const q = byId[h.id];
      return `<details><summary><span class="review-dot ${h.results.every((r) => r.correct) ? "right" : "wrong"}"></span><span>${e(q.title)}<small>${CATEGORIES[q.category].name}</small></span><span class="review-symbol">+</span></summary><p>${e(q.prompt)}</p><strong>${e(q.options[q.answer])}</strong><p>${e(q.explanation)}</p><a href="${e(q.source.url)}" target="_blank" rel="noopener noreferrer">${e(q.source.title)} &nearr;</a><button class="text-button" data-action="save-id" data-id="${q.id}">${state.progress[q.id]?.saved ? "Remove bookmark" : "Bookmark"}</button></details>`;
    })
    .join("")}</div></section>`;
}
function showScoring() {
  showModal(
    `<div class="eyebrow">HOUSE RULES</div><h2 id="modal-title">A little friendly incentive.</h2><div class="rules-table"><div><span>Correct answer</span><strong>+100</strong></div><div><span>Correct, feeling confident</span><strong>+150</strong></div><div><span>Wrong, feeling confident</span><strong>-30</strong></div><div><span>Correct after a hint</span><strong>+60</strong></div><div><span>Other wrong answers or passes</span><strong>0</strong></div></div><p>Confidence is optional. A hint switches it off. Difficulty and speed do not change the score. In rivalry mode, both players answer the same question and the first player alternates.</p><p>The score is just for fun. There is no time limit and no speed bonus.</p>`,
  );
}
function showAbout() {
  const sources = [
    ...new Map(bank.map((q) => [q.source.url, q.source])).values(),
  ];
  showModal(
    `<div class="eyebrow">THE READING ROOM</div><h2 id="modal-title">Good questions have roots.</h2><p>Common Room is an independent, noncommercial quiz inspired by MIT OpenCourseWare. The questions, scenarios, choices, hints, and explanations were written for this game with AI assistance. They are not an official MIT exam or an MIT-endorsed product.</p><p>Each answer links to the course material behind its concept. Some questions combine course concepts with new examples. Law questions concern the stated philosophical framework or hypothetical facts; they are not a guide to current law.</p><h3>Course credits</h3><ul class="credit-list"><li><strong>18.06SC Linear Algebra</strong> (2011), Gilbert Strang.</li><li><strong>18.05 Introduction to Probability and Statistics</strong> (2022), Jeremy Orloff and Jennifer French Kamrin; reading notes by Jeremy Orloff and Jonathan Bloom.</li><li><strong>6.041SC Probabilistic Systems Analysis and Applied Probability</strong> (2013), John Tsitsiklis; problem-solving videos by Kuang Xu and Jimmy Li. Probability puzzles use these course concepts in new scenarios.</li><li><strong>6.006 Introduction to Algorithms</strong> (2011), Erik Demaine and Srini Devadas; additional lecture-note authors are credited in the linked materials.</li><li><strong>7.03 Genetics</strong> (2004), Chris Kaiser, Gerald Fink, Leona Samson and Michelle Mischke.</li><li><strong>7.05 General Biochemistry</strong> (2020), Michael Yaffe and Matthew Vander Heiden.</li><li><strong>6.867 Machine Learning</strong> (2006), Tommi Jaakkola, Rohit Singh and Ali Mohammad; <strong>6.034 Artificial Intelligence</strong> (2005), Leslie Kaelbling and Tomás Lozano-Pérez; <strong>6.036 Introduction to Machine Learning</strong> (2020), Leslie Kaelbling, Tomás Lozano-Pérez, Isaac Chuang and Duane Boning. SERC lab authors are credited in the linked lab PDFs.</li><li><strong>24.235J Philosophy of Law</strong> (2012), Julia Markovits and Jennifer Carr; primary philosophers are identified in the course handouts.</li></ul><h3>Reuse &amp; privacy</h3><p>Quiz content and adaptations are shared under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-NC-SA 4.0</a>. Source materials retain their own credits and any stated exceptions. See <a href="https://ocw.mit.edu/pages/privacy-and-terms-of-use/" target="_blank" rel="noopener noreferrer">MIT OCW's terms</a>. This site has no ads, analytics, or account system. The app keeps your names, bookmarks, answers and progress in this browser's local storage. The hosting service receives ordinary page requests. Source links open the source website.</p><details class="source-directory"><summary>Browse all ${sources.length} source links</summary><ul>${sources.map((s) => `<li><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)}</a></li>`).join("")}</ul></details><p>Spot an ambiguous question? Note its ID in the question library and use the <a href="https://github.com/HannesStark/common-room-quiz/issues" target="_blank" rel="noopener noreferrer">project issue tracker</a>.</p><p class="small-note">Sources checked November 2026. Question quality matters more than winning an argument.</p>`,
  );
}
function openLibrary(filter = "all") {
  libraryFilter = filter;
  const qs = bank.filter((q) => filter === "all" || q.category === filter);
  showModal(
    `<div class="eyebrow">FOLLOW A RABBIT HOLE</div><h2 id="modal-title">The question library.</h2><p>${bank.length} questions. Answers stay folded until you open them.</p><div class="library-filters">${[["all", "Everything"], ...Object.entries(CATEGORIES).map(([k, c]) => [k, c.name])].map(([k, n]) => `<button class="filter-button ${k === filter ? "chosen" : ""}" data-action="filter-library" data-filter="${k}">${n}</button>`).join("")}</div><div class="review-list library">${qs.map((q) => `<details><summary><span class="review-dot" style="background:${CATEGORIES[q.category].color}"></span><span>${e(q.title)}<small>${q.id} &middot; ${CATEGORIES[q.category].name} &middot; ${LEVELS[q.level]}</small></span><span class="review-symbol">+</span></summary><p>${e(q.prompt)}</p><ol type="A">${q.options.map((o) => `<li>${e(o)}</li>`).join("")}</ol><details class="library-answer"><summary>Reveal answer &amp; explanation</summary><strong>${e(q.options[q.answer])}</strong><p>${e(q.explanation)}</p><a href="${e(q.source.url)}" target="_blank" rel="noopener noreferrer">${e(q.source.title)} &nearr;</a></details><button class="text-button" data-action="save-id" data-id="${q.id}">${state.progress[q.id]?.saved ? "Remove bookmark" : "Bookmark"}</button></details>`).join("")}</div>`,
  );
}
function bookmark(id) {
  state.progress[id] = {
    ...(state.progress[id] || {}),
    saved: !state.progress[id]?.saved,
  };
  save();
  toast(
    state.progress[id].saved
      ? "Saved for another conversation."
      : "Bookmark removed.",
  );
}
document.addEventListener("click", (ev) => {
  const target = ev.target.closest("[data-action]");
  if (!target || target.disabled) return;
  const action = target.dataset.action,
    s = state.session;
  if (action === "start") startGame();
  if (action === "new-confirm") {
    closeModal();
    startGame(true);
  }
  if (action === "close") closeModal();
  if (action === "home") openHome();
  if (action === "resume") {
    screen = "game";
    renderGame();
    moveFocus();
  }
  if (action === "scoring") showScoring();
  if (action === "ready" && s && ["handoff", "break"].includes(s.step)) {
    s.step = "question";
    save();
    renderGame();
    moveFocus();
  }
  if (action === "choose" && s?.step === "question") {
    s.selected = Number(target.dataset.choice);
    save();
    renderGame();
    document
      .querySelector(`[data-choice="${s.selected}"]`)
      ?.focus({ preventScroll: true });
  }
  if (action === "hint" && s?.step === "question") {
    s.hint = true;
    s.confident = false;
    save();
    renderGame();
  }
  if (action === "lock") lockAnswer();
  if (action === "skip") lockAnswer(true);
  if (action === "next") nextQuestion();
  if (action === "bookmark") {
    bookmark(s.deck[s.index].id);
    renderGame();
  }
  if (action === "save-id") {
    bookmark(target.dataset.id);
    target.textContent = state.progress[target.dataset.id].saved
      ? "Remove bookmark"
      : "Bookmark";
  }
  if (action === "filter-library") {
    closeModal();
    openLibrary(target.dataset.filter);
  }
  if (action === "retry-round") {
    const ids = s.history
      .filter((h) => h.results.some((r) => !r.correct))
      .map((h) => h.id);
    s.deck = s.deck.filter((q) => ids.includes(q.id));
    s.index = 0;
    s.history = [];
    s.answers = s.mode === "duel" ? [null, null] : [null];
    s.turn = 0;
    s.selected = null;
    s.hint = false;
    s.confident = false;
    s.step = "question";
    screen = "game";
    save();
    renderGame();
    moveFocus();
  }
  if (action === "discuss")
    showModal(
      `<div class="eyebrow">TAKE IT ONE STEP FURTHER</div><h2 id="modal-title">What would change your answer?</h2><p>Pick one assumption in this question and change it. Does the same answer still hold? Can you construct a counterexample, a different experiment, or a competing argument?</p><p>Bonus: explain your reasoning without using the subject's specialist vocabulary.</p>`,
    );
});
document.addEventListener("keydown", (ev) => {
  if (
    modal.open ||
    screen !== "game" ||
    ev.altKey ||
    ev.ctrlKey ||
    ev.metaKey ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(ev.target.tagName) ||
    ev.repeat
  )
    return;
  const s = state.session;
  if (s?.step === "question" && /^[1-4]$/.test(ev.key)) {
    ev.preventDefault();
    s.selected = s.deck[s.index].order[Number(ev.key) - 1];
    save();
    renderGame();
  }
  if (ev.key === "Enter") {
    if (
      ev.target.closest("button,a") &&
      ev.target.closest("[data-action]")?.dataset.action !== "choose"
    )
      return;
    ev.preventDefault();
    if (s.step === "question") lockAnswer();
    else if (s.step === "reveal") nextQuestion();
    else if (["handoff", "break"].includes(s.step)) {
      s.step = "question";
      save();
      renderGame();
      moveFocus();
    }
  }
});

try {
  const response = await fetch("questions.json");
  if (!response.ok) throw new Error("Could not load the question bank.");
  bank = await response.json();
  validateBank(bank);
  byId = Object.fromEntries(bank.map((q) => [q.id, q]));
  const c = state.config;
  if (
    !["coop", "duel", "solo"].includes(c.mode) ||
    !Array.isArray(c.categories) ||
    !c.categories.every((k) => CATEGORIES[k]) ||
    !Array.isArray(c.levels) ||
    !c.levels.every((l) => LEVELS[l]) ||
    !["all", "unseen", "missed", "saved"].includes(c.pool) ||
    !["10", "25", "50", "all"].includes(String(c.length)) ||
    !Array.isArray(c.names) ||
    c.names.length !== 2
  )
    state.config = structuredClone(defaultConfig);
  const s = state.session;
  if (
    s &&
    (!Array.isArray(s.deck) ||
      !s.deck.length ||
      !s.deck.every(
        (q) =>
          byId[q.id] &&
          Array.isArray(q.order) &&
          q.order.length === 4 &&
          new Set(q.order).size === 4 &&
          q.order.every((i) => Number.isInteger(i) && i >= 0 && i < 4),
      ) ||
      !["question", "handoff", "reveal", "break", "end"].includes(s.step) ||
      !Number.isInteger(s.index) ||
      s.index < 0 ||
      s.index >= s.deck.length ||
      !Array.isArray(s.history) ||
      !Array.isArray(s.answers) ||
      !Array.isArray(s.names))
  )
    state.session = null;
  save();
  renderHome();
} catch (error) {
  app.innerHTML = `<section class="loading"><h1>We could not open the question box.</h1><p>${e(error.message)} Please reload the page.</p><button class="button yellow" onclick="location.reload()">Try again</button></section>`;
}
