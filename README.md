# Torie

A local, two-player word strategy prototype played on a 15×15 board, built with React, TypeScript, and Vite.

## Run

```bash
npm install
npm run dev
```

Open the local address printed by Vite. Run the rule-engine tests with `npm test` and create a production build with `npm run build`.

## Rules implementation

The pure modules in `src/game` own board creation, move validation, scoring, alphabet cycling, and practical dictionary-based legal-move search. `src/App.tsx` owns the local hot-seat interface and snapshots confirmed state before moves and passes so testing actions can be undone.

Strict dictionary validation is enabled by default using a locally bundled SCOWL/ESDB size-50 American English list. Proper names, abbreviations, special categories, punctuation, and one-letter entries are excluded. Its license is included in `src/data/SCOWL-LICENSE.txt`.

Vowels refresh independently once a player uses every remaining vowel. Clearing the remaining vowels and consonants on the same submitted move awards a 10-point Cycle Clear Bonus. Legal-move search checks a smaller common-word subset against occupied anchors (or the four centers on the opening turn); it is practical rather than exhaustive and does not reveal the word or its position to players. The development Force Pass control remains available when this bounded search misses an opportunity.
