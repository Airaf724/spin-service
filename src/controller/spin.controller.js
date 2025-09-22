import User from "../models/user.model.js";
import Spin from "../models/spin.model.js";
import Contest from "../models/contest.model.js";
import cron from "node-cron";

// ------------------------
// 1. Watch Ad → Generate Spins
// ------------------------
export const generateRewardSpins = async (req, res) => {
  try {
    const { userId } = req.body; // get userId from body
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    if (user.lastAdWatched && now - user.lastAdWatched < 5 * 60 * 1000) {
      return res
        .status(429)
        .json({ message: "Please wait before watching another ad." });
    }

    user.availableSpins += 5;
    user.lastAdWatched = now;
    await user.save();

    return res.status(200).json({
      message: "5 spins added successfully",
      availableSpins: user.availableSpins,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------
// 2. Spin the Wheel
// ------------------------
export const spinTheWheel = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.availableSpins <= 0)
      return res
        .status(400)
        .json({ message: "No spins left. Watch ads to earn spins." });

    // Deduct 1 spin
    user.availableSpins -= 1;

    // Rewards probabilities
    const rewards = [
      { type: "points", value: 10, weight: 40 },
      { type: "points", value: 20, weight: 30 },
      { type: "points", value: 50, weight: 15 },
      { type: "diamonds", value: 1, weight: 10 },
      { type: "diamonds", value: 3, weight: 5 },
    ];

    const totalWeight = rewards.reduce((acc, r) => acc + r.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedReward;

    for (const reward of rewards) {
      if (random < reward.weight) {
        selectedReward = reward;
        break;
      }
      random -= reward.weight;
    }

    // Update balances
    if (selectedReward.type === "points") {
      user.points += selectedReward.value;

      // Update contestPoints if contest active
      const activeContest = await Contest.findOne({ status: "active" });
      if (activeContest) user.contestPoints += selectedReward.value;
    } else {
      user.diamonds += selectedReward.value;
    }

    await user.save();

    await Spin.create({
      userId,
      rewardType: selectedReward.type,
      rewardValue: selectedReward.value,
    });

    return res.status(200).json({
      rewardType: selectedReward.type,
      rewardValue: selectedReward.value,
      availableSpins: user.availableSpins,
      points: user.points,
      diamonds: user.diamonds,
      contestPoints: user.contestPoints,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------
// 3. Get User Balance
// ------------------------
export const getUserBalance = async (req, res) => {
  try {
    const { userId } = req.body; // fetch from body
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const user = await User.findById(userId).select(
      "points diamonds availableSpins contestPoints"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------
// 4. Get Leaderboard
// ------------------------
export const getLeaderboard = async (req, res) => {
  try {
    const contest = await Contest.findOne({ status: "active" });
    if (!contest)
      return res.status(404).json({ message: "No active contest right now." });

    const leaderboard = await User.find({})
      .sort({ contestPoints: -1 })
      .limit(10)
      .select("username contestPoints");

    return res.status(200).json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------
// 5. Start Contest (Admin Only)
// ------------------------
export const startContest = async (req, res) => {
  try {
    await Contest.updateMany({ status: "active" }, { status: "closed" });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);

    const contest = await Contest.create({
      startDate,
      endDate,
      status: "active",
    });

    await User.updateMany({}, { $set: { contestPoints: 0 } });

    return res
      .status(201)
      .json({ message: "Contest started successfully", contest });
  } catch (err) {
    console.error("Error starting contest:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------
// 6. Get Active Contest
// ------------------------
export const getActiveContest = async (req, res) => {
  try {
    const contest = await Contest.findOne({ status: "active" });
    if (!contest)
      return res.status(404).json({ message: "No active contest found" });

    return res.status(200).json(contest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------
// 7. Auto-close expired contests
// ------------------------
cron.schedule("*/10 * * * *", async () => {
  const now = new Date();
  await Contest.updateMany(
    { status: "active", endDate: { $lte: now } },
    { status: "closed" }
  );
  console.log("Checked contests, closed expired ones");
});
