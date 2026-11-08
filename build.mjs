import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { validateBank } from "./engine.js";
const questions = JSON.parse(
  await readFile(new URL("./questions.json", import.meta.url)),
);
validateBank(questions);
await mkdir(new URL("./dist", import.meta.url), { recursive: true });
for (const f of [
  "index.html",
  "style.css",
  "app.js",
  "engine.js",
  "questions.json",
  "icon.svg",
  "README.md",
  "LICENSE",
])
  await copyFile(
    new URL(f, import.meta.url),
    new URL("dist/" + f, import.meta.url),
  );
await writeFile(new URL("dist/.nojekyll", import.meta.url), "");
console.log(
  `Built ${questions.length} questions. No runtime dependencies or external assets.`,
);
