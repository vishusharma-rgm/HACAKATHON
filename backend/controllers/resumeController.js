const Resume = require("../models/Resume");
const AnalysisResult = require("../models/AnalysisResult");
const mongoose = require("mongoose");
const { extractTextFromPdf } = require("../services/resumeParser");
const { parseLinkedInLikeProfile } = require("../services/linkedinParser");
const { analyzeResumeWithAI } = require("../services/openaiService");
const { computeSkillMatch } = require("../services/skillMatcher");
const { calculateScore } = require("../utils/scoringUtils");

const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume PDF file is required." });
    }

    const requiredSkills = Array.isArray(req.body.requiredSkills)
      ? req.body.requiredSkills
      : typeof req.body.requiredSkills === "string"
        ? req.body.requiredSkills.split(",").map((item) => item.trim()).filter(Boolean)
        : [];

    const originalText = await extractTextFromPdf(req.file.buffer);

    const aiResult = await analyzeResumeWithAI({
      resumeText: originalText,
      requiredSkills,
    });

    const skillMatch = computeSkillMatch({
      resumeSkills: aiResult.extractedSkills,
      requiredSkills,
    });

    const score = calculateScore({
      matchedSkillsCount: skillMatch.matchedSkills.length,
      totalRequiredSkills: skillMatch.requiredSkills.length,
    });

    if (mongoose.connection.readyState === 1) {
      const resumeDoc = await Resume.create({
        originalText,
        extractedSkills: aiResult.extractedSkills,
      });

      await AnalysisResult.create({
        resumeId: resumeDoc._id,
        score,
        matchedSkills: skillMatch.matchedSkills,
        missingSkills: skillMatch.missingSkills,
        suggestions: aiResult.improvementSuggestions,
      });
    }

    return res.status(200).json({
      score,
      extractedSkills: aiResult.extractedSkills,
      matchedSkills: skillMatch.matchedSkills,
      missingSkills: skillMatch.missingSkills,
      suggestions: aiResult.improvementSuggestions,
    });
  } catch (error) {
    console.error("Resume analysis failed:", error);
    return res.status(500).json({
      error: "Resume analysis failed.",
      details: error.message,
    });
  }
};

const parseLinkedInProfile = async (req, res) => {
  try {
    const profileText = String(req.body.profileText || "").trim();
    if (!profileText) {
      return res.status(400).json({ error: "profileText is required." });
    }

    const requiredSkills = Array.isArray(req.body.requiredSkills)
      ? req.body.requiredSkills
      : typeof req.body.requiredSkills === "string"
        ? req.body.requiredSkills.split(",").map((item) => item.trim()).filter(Boolean)
        : [];

    const profile = parseLinkedInLikeProfile(profileText);

    const aiResult = await analyzeResumeWithAI({
      resumeText: profileText,
      requiredSkills,
    });

    const skillMatch = computeSkillMatch({
      resumeSkills: aiResult.extractedSkills,
      requiredSkills,
    });

    const score = calculateScore({
      matchedSkillsCount: skillMatch.matchedSkills.length,
      totalRequiredSkills: skillMatch.requiredSkills.length,
    });

    return res.status(200).json({
      source: "linkedin-like-parser",
      profile,
      score,
      extractedSkills: aiResult.extractedSkills,
      matchedSkills: skillMatch.matchedSkills,
      missingSkills: skillMatch.missingSkills,
      suggestions: aiResult.improvementSuggestions,
    });
  } catch (error) {
    console.error("LinkedIn-like parsing failed:", error);
    return res.status(500).json({
      error: "LinkedIn-like parsing failed.",
      details: error.message,
    });
  }
};

module.exports = {
  analyzeResume,
  parseLinkedInProfile,
};
