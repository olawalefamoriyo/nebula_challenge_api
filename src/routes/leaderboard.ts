import { Router } from "express";
import leaderboardService from "../services/leaderboard";

const router = Router();

let authenticateToken: any = (req: any, res: any, next: any) => next();
export function setAuthMiddleware(mw: any) {
  authenticateToken = mw;
}

router.post("/score", authenticateToken, async (req: any, res) => {
  try {
    const { score } = req.body;
    if (score === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required field: score" });
    }
    const scoreNumber = Number(score);
    if (isNaN(scoreNumber) || scoreNumber < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Score must be a positive number" });
    }
    const user = req.user;
    const result = await leaderboardService.submitScore({
      user_id: user.user_id,
      user_name: user.user_name,
      score: scoreNumber,
    });
    if (result.success) {
      res
        .status(201)
        .json({ success: true, message: result.message, data: result.data });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    console.error("Score submission error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const result = await leaderboardService.getLeaderboard();
    if (result.success) {
      res
        .status(200)
        .json({ success: true, message: result.message, data: result.data });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    console.error("Leaderboard retrieval error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.delete("/leaderboard", authenticateToken, async (req: any, res) => {
  try {
    const result = await leaderboardService.deleteAllScores();
    if (result.success) {
      res
        .status(200)
        .json({ success: true, message: result.message, data: result.data });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    console.error("Delete leaderboard error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
