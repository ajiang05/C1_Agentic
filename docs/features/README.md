# MVP feature documentation

These documents break [mvp.md](../../mvp.md) into implementable features for the [eight-person team](../team-ownership.md). They describe planned behavior; the repository currently contains a scaffold, not implemented features.

## Feature guides

| Feature | Primary ownership | Priority |
| --- | --- | --- |
| [Onboarding and initial preferences](onboarding.md) | Person 2 (UI), person 7 (storage). | Supporting MVP; use default preferences if skipped. |
| [Course upload and ingestion](course-upload.md) | Person 2 (UI), person 4 (ingestion), person 7 (storage). | Core MVP. |
| [Curriculum generation](curriculum-generation.md) | Person 4. | Core MVP. |
| [Learning journey](learning-journey.md) | Person 2 (UI), person 6 (recommendations), person 7 (progress). | Core MVP. |
| [Grounded lessons and practice](lesson-generation.md) | Person 5 (Tutor Agent), person 3 (UI). | Core MVP. |
| [Answer evaluation](answer-evaluation.md) | Person 6 (evaluation), person 3 (feedback UI). | Core MVP. |
| [Adaptive teaching and next-action selection](adaptive-teaching.md) | Person 6 (decisions), person 5 (content), person 7 (state). | Core MVP; primary product differentiator. |
| [Knowledge model and persistent memory](learning-memory.md) | Person 7. | Core MVP. |
| [Weak-topic review and basic spaced repetition](review.md) | Person 6 (selection), person 7 (storage), person 2 (UI). | Basic return-session review is core; time-based scheduling is supporting MVP. |
| [Source grounding and citations](source-grounding.md) | Person 4 (retrieval), person 5 (generation), person 3 (source UI). | Core MVP success criterion. |
| [Human verification and content flagging](human-verification.md) | Person 3 (UI), person 7 (storage), person 8 (verification/demo). | Core MVP success criterion. |
| [Progress dashboard](progress.md) | Person 2 (UI), person 7 (data), person 6 (recommendation). | Basic mastery display is core; richer insights are supporting MVP. |

## Scope decisions

- Grounding, human verification, and persistent memory are required by the MVP success criteria, so they are core even where the original priority list calls them optional.
- Weak-topic review on return is sufficient for the first demo; sophisticated spaced repetition is deferred.
- The questionnaire can fall back to default preferences. Behavioral updates to preference weights are optional after the adaptive loop works.
- Initial file-format support and question formats are proposed limits for the four-hour implementation, not capabilities that already exist.
- XP, streaks, animations, achievements, countdowns, and automatic study schedules remain stretch work and have no implementation commitment here.

## Integration order

1. Agree on shared identifiers and contracts for sources, concepts, questions, attempts, evaluations, next actions, and progress.
2. Connect upload → curriculum → journey while lesson development uses agreed mock responses.
3. Connect tutor → evaluation → atomic persistence → next-action selection → tutor.
4. Verify return-session memory, source inspection, and human flagging.
5. Use the feature acceptance criteria to rehearse the complete demo with sample course materials.

Person 1 coordinates integration and deployment. Person 8 owns the end-to-end demo checks; each feature owner validates their component. Technology choices, endpoint paths, and exact schema definitions remain to be agreed by the team.
