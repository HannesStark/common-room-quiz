export const CATEGORIES = {
  math: {
    name: "Math",
    number: "01",
    color: "#dfe8fb",
    description: "Algebra, statistics & beautiful patterns",
  },
  bio: {
    name: "Biology",
    number: "02",
    color: "#e2edd9",
    description: "Molecules, mechanisms & experiments",
  },
  cs: {
    name: "Informatics",
    number: "03",
    color: "#f6dfcf",
    description: "Algorithms, logic & clever shortcuts",
  },
  ml: {
    name: "Machine learning",
    number: "04",
    color: "#e9e0f5",
    description: "Models, evidence & unexpected failures",
  },
  law: {
    name: "Law",
    number: "05",
    color: "#f5e8b9",
    description: "Rules, rights & difficult distinctions",
  },
  probability: {
    name: "Probability puzzles",
    number: "06",
    color: "#d6eee9",
    description: "Chance, surprises & delightful traps",
  },
};
export const LEVELS = { 1: "Curious", 2: "Think it through", 3: "Stretch" };
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function eligibleQuestions(bank, config, progress = {}) {
  return bank.filter(
    (q) =>
      config.categories.includes(q.category) &&
      config.levels.includes(q.level) &&
      (config.pool !== "unseen" || !progress[q.id]?.attempts) &&
      (config.pool !== "missed" || progress[q.id]?.missed) &&
      (config.pool !== "saved" || progress[q.id]?.saved),
  );
}
export function createDeck(bank, config, progress = {}, random = Math.random) {
  const eligible = eligibleQuestions(bank, config, progress);
  const bins = Object.fromEntries(
    config.categories.map((c) => [
      c,
      shuffle(
        eligible.filter((q) => q.category === c),
        random,
      ),
    ]),
  );
  // Within each subject, prefer new questions. Each cycle visits every active subject once.
  if (config.pool === "all")
    for (const bin of Object.values(bins))
      bin.sort(
        (a, b) =>
          Number(Boolean(progress[a.id]?.attempts)) -
          Number(Boolean(progress[b.id]?.attempts)),
      );
  const deck = [];
  while (Object.values(bins).some((b) => b.length)) {
    for (const category of shuffle(config.categories, random)) {
      const q = bins[category].shift();
      if (q) deck.push({ id: q.id, order: shuffle([0, 1, 2, 3], random) });
    }
  }
  return deck.slice(
    0,
    config.length === "all" ? deck.length : Number(config.length),
  );
}
export function points(correct, confident, hint) {
  if (!correct) return confident && !hint ? -30 : 0;
  return hint ? 60 : confident ? 150 : 100;
}
export function questionResult(question, answers) {
  return answers.map((a) => ({
    ...a,
    correct: a.choice === question.answer,
    points: points(a.choice === question.answer, a.confident, a.hint),
  }));
}
export function totals(history, players) {
  return Array.from({ length: players }, (_, p) =>
    history.reduce(
      (s, h) => ({
        points: s.points + h.results[p].points,
        correct: s.correct + Number(h.results[p].correct),
      }),
      { points: 0, correct: 0 },
    ),
  );
}
export function validateBank(bank) {
  if (!Array.isArray(bank) || bank.length === 0)
    throw new Error("The question bank is empty.");
  const ids = new Set();
  for (const q of bank) {
    if (!q.id || ids.has(q.id))
      throw new Error(`Duplicate or missing question ID: ${q.id}`);
    ids.add(q.id);
    if (!CATEGORIES[q.category] || !LEVELS[q.level])
      throw new Error(`Invalid category or level: ${q.id}`);
    if (!q.title || !q.prompt || !q.hint || !q.explanation)
      throw new Error(`Missing question text: ${q.id}`);
    if (
      q.options?.length !== 4 ||
      new Set(q.options).size !== 4 ||
      q.options.some((o) => typeof o !== "string" || !o.trim())
    )
      throw new Error(`Invalid options: ${q.id}`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3)
      throw new Error(`Invalid answer: ${q.id}`);
    if (!q.source?.title || !/^https:\/\//.test(q.source?.url || ""))
      throw new Error(`Missing source: ${q.id}`);
  }
}
