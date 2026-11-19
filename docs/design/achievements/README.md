# Learner achievement preview

This offline prototype illustrates the original first-unlock flow. The application exposes **Dashboard → Achievements** from the first visit, including for learners with zero badges. [Current gallery behavior](../../learning-achievements-plan.md#art-gallery-access-browsing-and-reveal-states)

[Open the interactive preview](index.html) directly in a browser. It uses the first-edition artwork and sample learner progress. Each reload resets the demo.

| Try this | What to look for |
| --- | --- |
| Open **Art Gallery** and select **View artwork**. | The latest earned piece is featured. Details open in place. Escape or the close button returns to the collection. |
| Select **All achievements**. | Visible locked badges have subdued artwork and readable requirements. A neutral mystery mark gives the hidden count. The preview's catalogue contains only the 36 visible entries. |
| Choose **Dashboard → Practice**, then answer the sample. | The saved answer stays on screen. The badge appears at the top on phones or the bottom right on desktop. Click it for details, then close to return to your answer. Hover or keyboard focus pauses the five-second timer. |
| Select **Try first unlock** and practice once. | Earning the first learner award makes the gallery accessible. Switch the learning subject to see its independent empty collection. Switch the interface language to read the same collection in English or Japanese. |

The dashboard reserves its first sections for lessons and practice. Recent badges and one attainable milestone appear below them. A learner who teaches will see their learning awards here. Teaching awards belong to the teaching dashboard and gallery.

The preview simulates a successful answer locally. Production work includes storing the award exactly once, extending the authenticated event path for lesson and cross-device unlocks, and measuring the additional cost on answer saves. Defer gallery data and artwork until the corresponding view opens. [Learner acceptance criteria](../../learning-achievements-plan.md) · [Teaching plan](../../teacher-achievements-plan.md)

[Desktop gallery](gallery-1280.png) · [Japanese mobile gallery](gallery-390.png) · [Dashboard](dashboard.png) · [Mobile unlock popup](popup-mobile.png)

The gallery displays eight tiles per page plus the featured earned piece. From the repository root, run `node docs/design/achievements/check-gallery.cjs` with the web app's dependencies and local Chrome installed to check mobile and desktop request counts, navigation and popup behavior. [Performance audit](../../achievement-performance-audit.md)
