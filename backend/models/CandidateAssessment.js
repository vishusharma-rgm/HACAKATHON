const mongoose = require('mongoose');

const candidateAssessmentSchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true,
    unique: true,
  },
  claimedSkills: {
    type: [String],
    default: [],
  },
  authenticityScore: {
    type: Number,
    default: null,
  },
  claimStatus: {
    type: String,
    default: 'pending',
  },
  shortlist: {
    type: [
      {
        companyId: String,
        companyName: String,
        role: String,
        fitScore: Number,
      },
    ],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

candidateAssessmentSchema.pre('save', function beforeSave(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('CandidateAssessment', candidateAssessmentSchema);
