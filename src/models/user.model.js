// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    points: { type: Number, default: 0 },
    diamonds: { type: Number, default: 0 },
    availableSpins: { type: Number, default: 0 },
    contestPoints: { type: Number, default: 0 },
    lastAdWatched: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
