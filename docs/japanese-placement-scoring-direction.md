# Japanese placement scoring direction

2026-10-23. User correction to section 4e: existing Japanese proficiency standards and published evidence should support the initial lesson-placement assessment. A new in-house pilot study is **not a prerequisite for release**. This supersedes the earlier roadmap that made collecting and fitting our own learner data the next mandatory step.

## What the published sources establish

The [official JLPT FAQ](https://www.jlpt.jp/e/faq/) dates the current framework to the 2010 revision. It explains that N3 bridges the old levels 2 and 3, that candidates take different tests for each level, and that official scores use item response theory rather than a total of fixed points per correct answer. Therefore the framework is an established reference, but official scaled pass marks are not raw-percentage cutoffs for our different questions.

The [official competence summaries](https://www.jlpt.jp/e/about/levelsummary.html) provide the reading progression to anchor content:

| Reference | Reading demands to check |
| --- | --- |
| N5 | Basic expressions and sentences using kana and basic kanji. |
| N4 | Familiar daily topics expressed through basic vocabulary and kanji. |
| N3 | Everyday texts, summary information and main points in somewhat harder material with support. |
| N2 | Varied articles/commentaries and general-topic texts, including the writer's intent. |
| N1 | Complex or abstract texts, their structure, deeper contents and the writer's intent. |

The [official item-type guidance](https://www.jlpt.jp/e/guideline/testsections.html), including the [N2 task purposes](https://www.jlpt.jp/e/guideline/pdf/n2_e.pdf), supplies references for kanji reading, vocabulary in context, grammatical form, sentence composition and passage comprehension. Use these references to check task demands as well as vocabulary/grammar labels. Keep our permitted source content and its provenance; the framework does not establish that every repository label or adaptation is correct.

These sources support content alignment. They do not supply six empirical response probabilities for each of our 470 adapted/original items. The inspected sources have not established a reusable fitted model for this exact bank. That is a limit on claiming statistical calibration, not a reason to require our own study for a provisional product estimate.

## Revised product approach

Use a documented, versioned Japanese placement rubric aligned with these standards and appropriate licensed material. Treat it as a criterion-based product policy. Its progression and decision thresholds must be stated as our own rules unless an applicable published method directly supplies them; do not describe designed thresholds as empirical estimates or official JLPT conversions.

Keep the requested experience: twenty-minute server deadline, initially 24 questions, changing difficulty as responses arrive, and an immediate provisional study band/domain breakdown. Require adequate reading and sentence-construction evidence for advanced estimates; kana or isolated advanced vocabulary must not establish N1/N2 ability. Preserve explicit insufficient-evidence outcomes. The result describes the assessed reading/constrained-construction scope and does not award an official JLPT qualification.

Published or licensed empirical data can improve the policy when it applies to the relevant questions, formats and population. An optional later study can also improve it. Neither should become an automatic requirement to recruit our own pilot cohort before releasing this initial placement feature.

## Next implementation increment

1. Document the source-to-level/task mapping and identify weak anchors in the assembled bank. Correct or exclude unsupported difficulty labels; importing a community tag does not complete this check.
2. Specify the transparent routing/result rubric, evidence minima and boundary cases against published task descriptions and reference examples. State the basis for each rule. Do not populate the current likelihood fields with invented calibration values.
3. Adapt the existing Japanese engine, versioned bank policy and publication checks to support this rubric. Retain shared grading, timer, passage exclusions, persistence, authorization and result rendering. Preserve immutable historical schemas/results instead of building a second assessment implementation or copying English rules.
4. Use TDD red/green for policy, readiness, compatibility, insufficient evidence and timing; complete content/attribution checks and real-bank learner/teacher browser journeys. Use Impeccable for any UI/copy/style changes.

The subsequent [rubric-v1 implementation](japanese-placement-rubric.md) now adds schema-v5 source-aligned routing and results to the existing engine. V5 requires explicit anchor alignment and the versioned policy, with no likelihoods or mandatory pilot. Schemas 3/4 retain their earlier contracts. Bank content/rights/placement checks remain digest-bound; no fake evidence or review approvals have been added and the draft remains unpublished. The offline pilot tooling remains optional and needs no additional work now. Brandon retains commit and push responsibility.
