import { Router } from "express";
import ActivityAttempt from "../models/ActivityAttempt";

const router = Router();

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end } as const;
}

router.get("/today", async (_req, res) => {
  const { start, end } = getTodayRange();

  const startedFilter = {
    $expr: {
      $and: [
        { $gte: [{ $ifNull: ["$startedAt", "$createdAt"] }, start] },
        { $lt: [{ $ifNull: ["$startedAt", "$createdAt"] }, end] },
      ],
    },
  };

  const completedFilter = {
    $or: [{ status: "completed" }, { status: null }],
    $expr: {
      $and: [
        { $gte: [{ $ifNull: ["$endedAt", "$createdAt"] }, start] },
        { $lt: [{ $ifNull: ["$endedAt", "$createdAt"] }, end] },
      ],
    },
  };

  const durationExpr = () => ({
    $cond: [
      {
        $and: [
          { $ne: ["$startedAt", null] },
          { $ne: ["$endedAt", null] },
        ],
      },
      { $divide: [{ $subtract: ["$endedAt", "$startedAt"] }, 1000] },
      { $ifNull: ["$durationSec", 0] },
    ],
  });

  try {
    const [started, completed, aggregates] = await Promise.all([
      ActivityAttempt.countDocuments(startedFilter),
      ActivityAttempt.countDocuments(completedFilter),
      ActivityAttempt.aggregate<{
        avgDurationSec: number;
        xpAwarded: number;
      }>([
        { $match: completedFilter },
        {
          $group: {
            _id: null,
            durationSum: {
              $sum: durationExpr(),
            },
            durationCount: {
              $sum: {
                $cond: [{ $gt: [durationExpr(), 0] }, 1, 0],
              },
            },
            xpAwarded: {
              $sum: {
                $ifNull: [
                  "$xpAwarded",
                  {
                    $ifNull: [
                      "$grantedXp",
                      {
                        $ifNull: ["$xp", 0],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            avgDurationSec: {
              $cond: [
                { $gt: ["$durationCount", 0] },
                { $divide: ["$durationSum", "$durationCount"] },
                0,
              ],
            },
            xpAwarded: { $ifNull: ["$xpAwarded", 0] },
          },
        },
      ]),
    ]);

    const stats = aggregates[0] ?? { avgDurationSec: 0, xpAwarded: 0 };
    const completionRatePct =
      started > 0 ? (completed / started) * 100 : 0;

    res.json({
      started,
      completed,
      completionRatePct,
      avgDurationSec: stats.avgDurationSec ?? 0,
      xpAwarded: stats.xpAwarded ?? 0,
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error) {
    console.error("[admin/kpis] Error calculando KPIs", error);
    res.status(500).json({ error: "AGGREGATION_FAILED" });
  }
});

export default router;
