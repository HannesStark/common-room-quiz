# Common Room

A free, noncommercial quiz for shared-screen play, friendly rivalry, or solo exploration. The bank contains 216 original questions: 36 each in mathematics, biology, informatics, machine learning, philosophy of law, and probability puzzles. Each has four choices, a hint, an explanation, and an MIT OpenCourseWare source link.

Probability puzzles is a separate category with conditional-probability traps, waiting times, random walks, geometric probability, and decisions under uncertainty. Select it alone for a puzzle night, or combine it with any other subject.

## Play

Choose cooperative play, two-player rivalry, or solo mode. Sessions can have 10, 25, 50, or every eligible question. The default difficulty omits stretch questions. Select any mix of subjects. Both players get the same questions in rivalry mode, with alternating first player and a handoff screen before the second answer. Look away while the other player chooses; this is a game of trust on a shared screen.

Correct answers score 100 points. Optional confidence makes a correct answer worth 150 and a wrong answer worth -30. A hint disables confidence and makes a correct answer worth 60; a wrong answer after a hint scores zero. Passing scores zero. There is no time limit or speed bonus.

Progress, unfinished rounds, and bookmarks are saved in this browser. They do not sync across devices. Private browsing or clearing site data can remove the save. The app has no analytics, accounts, or external runtime assets. The host still handles ordinary HTTP requests.

## Run and test

Requires a current Node.js runtime. No package installation is needed to run or build the app.

```sh
npm start
npm test
npm run build
```

The preview listens on http://127.0.0.1:4173. The build writes static files to `dist/`. Serve them from any static host; paths work below a project subdirectory. `questions.json` is the editable content source. `engine.js` contains deck selection, validation and scoring; `app.js` contains the UI and browser save state.

## Sources and license

These are newly written, AI-assisted quiz scenarios based on course concepts, not an official exam question bank. Each question carries its source URL. The app's About and sources panel lists course authors and source material. Source dates refer to the courses, not a claim of current legal advice. Law questions ask about stated philosophical views and hypothetical rules.

Quiz content and adaptations are available under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Original web application code is under the same license for simplicity. Linked source materials retain their stated credits and any exceptions. See [MIT OpenCourseWare terms](https://ocw.mit.edu/pages/privacy-and-terms-of-use/). Common Room is independent and is not affiliated with or endorsed by MIT. No MIT logos or course artwork are used.

Source materials were checked in November 2026. If you find an ambiguous question, report its ID from the question library and explain the alternative interpretation.
