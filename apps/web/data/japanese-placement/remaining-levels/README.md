# N5/N4/N1 reading and sentence-building drafts

This pack adds 180 automatically markable items: twenty reading passages with forty choice questions and twenty sentence constructions at each of N5, N4 and N1. The shared catalog combines these with the original 120 N2/N3 items. It does not activate an assessment or assign calibration likelihoods.

`remaining-levels-content.json` contains the curated tasks and changes. `source-excerpts.json` contains 120 retained source records, retrieval byte hashes and a 1,439-row selection ledger: 120 selected, 1,305 deferred and fourteen free-text tasks excluded. Deferred includes the 254 N5 MCQs reserved for later domain curation; it is not a statement that the other records are wrong. The ledger counts passage/question records and grammar first-example candidates, not every exercise/example in each upstream file.

`content-lock.json` uses the same schema-v2, role-based checksum loader as the N2/N3 pack. Source licences and full notices live in the parent `licences/` folder; every source is also attributed in the content JSON. Everything stays outside `public/`, including source keys and complete accepted orders.

Run from the repository root:

```sh
yarn japanese-placement:content --strict
yarn test:japanese-placement
```

See [the shared handoff](../../../../../docs/japanese-placement-content.md) for source pins, adaptation decisions, checks and remaining domain/calibration work. There is no audio, free response or individual teacher marking in the imported tasks.
