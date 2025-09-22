// models/Spin.js
import mongoose from "mongoose";

const spinSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rewardType: { type: String, enum: ["points", "diamonds"], required: true },
    rewardValue: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Spin", spinSchema);
