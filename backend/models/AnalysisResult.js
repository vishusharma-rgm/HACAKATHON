const mongoose = require("mongoose");

const analysisResultSchema = new mongoose.Schema({
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  matchedSkills: {
    type: [String],
    default: [],
  },
  missingSkills: {
    type: [String],
    default: [],
  },
  suggestions: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AnalysisResult", analysisResultSchema);
