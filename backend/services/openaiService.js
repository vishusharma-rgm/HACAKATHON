const openai = require("../config/openai");

const FALLBACK_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node",
  "Express",
  "MongoDB",
  "SQL",
  "Python",
  "Java",
  "C++",
  "AWS",
  "Docker",
  "Kubernetes",
  "System Design",
  "DSA",
  "REST API",
  "Git",
];

const extractSkillsFallback = (resumeText) => {
  const lowerText = resumeText.toLowerCase();

  return FALLBACK_SKILLS.filter((skill) =>
    lowerText.includes(skill.toLowerCase())
  );
};

const analyzeResumeWithAI = async ({ resumeText, requiredSkills = [] }) => {
  if (!resumeText) {
    throw new Error("resumeText is required for AI analysis.");
  }

  if (!openai) {
    return {
      extractedSkills: extractSkillsFallback(resumeText),
      improvementSuggestions:
        "Add measurable project impact, highlight missing core backend/database skills, and tailor summary to the target role.",
    };
  }

  const prompt = `You are a resume analyzer. Return strict JSON with keys: extractedSkills (string[]), improvementSuggestions (string).

Required skills (if provided): ${JSON.stringify(requiredSkills)}

Resume text:\n${resumeText}`;

  let outputText = "";
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });
    outputText = response.output_text || "";
  } catch (error) {
    console.warn("OpenAI request failed, using fallback:", error.message);
    return {
      extractedSkills: extractSkillsFallback(resumeText),
      improvementSuggestions:
        "Auto-fallback mode: improve missing required skills and add quantified project outcomes.",
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch (_error) {
    parsed = {
      extractedSkills: extractSkillsFallback(resumeText),
      improvementSuggestions:
        "Improve role-specific keywords and include missing technical skills from job requirements.",
    };
  }

  return {
    extractedSkills: Array.isArray(parsed.extractedSkills)
      ? parsed.extractedSkills.filter(Boolean)
      : extractSkillsFallback(resumeText),
    improvementSuggestions:
      typeof parsed.improvementSuggestions === "string"
        ? parsed.improvementSuggestions
        : "Improve resume clarity and add missing job-relevant skills.",
  };
};

module.exports = {
  analyzeResumeWithAI,
};
