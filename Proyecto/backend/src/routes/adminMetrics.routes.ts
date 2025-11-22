import { Router } from "express";
import ActivityAttempt from "../models/ActivityAttempt";

const router = Router();

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end } as const;
};

router.get("/precision-today", async (_req, res) => {
  const { start, end } = getTodayRange();

  try {
    const [precision] = await ActivityAttempt.aggregate<{
      correctTotal: number;
      answersTotal: number;
    }>([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $lookup: {
          from: "activities",
          localField: "activityId",
          foreignField: "_id",
          as: "activity",
        },
      },
      { $unwind: "$activity" },
      {
        $match: {
          $or: [
            { "activity.isDeleted": { $exists: false } },
            { "activity.isDeleted": false },
          ],
        },
      },
      {
        $group: {
          _id: null,
          correctTotal: { $sum: { $ifNull: ["$correctCount", 0] } },
          answersTotal: { $sum: { $ifNull: ["$totalCount", 0] } },
        },
      },
      { $project: { _id: 0, correctTotal: 1, answersTotal: 1 } },
    ]);

    const correctTotal = precision?.correctTotal ?? 0;
    const answersTotal = precision?.answersTotal ?? 0;
    const precisionPercent =
      answersTotal > 0 ? Math.round((correctTotal / answersTotal) * 100) : 0;

    res.json({ precisionPercent, correctTotal, answersTotal });
  } catch (error) {
    console.error("[admin/metrics] Error calculando precisión", error);
    res.status(500).json({ error: "PRECISION_TODAY_FAILED" });
  }
});

export default router;
