import express from "express";
import {
  generateRewardSpins,
  getActiveContest,
  getLeaderboard,
  getUserBalance,
  spinTheWheel,
  startContest,
} from "../controller/spin.controller.js";

const router = express.Router();

// watch ad generate spins
router.post("/ads/reward", generateRewardSpins);

// spin the wheel
router.post("/spin", spinTheWheel);

// get user balance
router.get("/user/balance", getUserBalance);

//leadrboard
router.get("/leaderboard", getLeaderboard);

router.post("/contest/start", startContest);

router.get("/contest/active", getActiveContest);
export default router;
