const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  originalText: {
    type: String,
    required: true,
  },
  extractedSkills: {
    type: [String],
    default: [],
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Resume", resumeSchema);
