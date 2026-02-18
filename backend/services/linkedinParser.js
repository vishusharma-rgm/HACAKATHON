const cleanText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const detectHeadline = (text) => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines[0] || "LinkedIn Profile Candidate";
};

const detectExperienceYears = (text) => {
  const normalized = String(text || "").toLowerCase();
  const explicitYearsMatch = normalized.match(/(\d+)\+?\s+years?/);

  if (explicitYearsMatch) {
    return Number(explicitYearsMatch[1]);
  }

  const experienceMentions = (normalized.match(/\b(intern|engineer|developer|analyst|lead|manager)\b/g) || []).length;
  if (!experienceMentions) return 0;
  return Math.min(experienceMentions, 10);
};

const parseLinkedInLikeProfile = (profileText) => {
  const normalized = cleanText(profileText);

  if (!normalized) {
    throw new Error("profileText is required for LinkedIn-like parsing.");
  }

  const summary =
    normalized.length > 320
      ? `${normalized.slice(0, 317)}...`
      : normalized;

  return {
    headline: detectHeadline(profileText),
    estimatedExperienceYears: detectExperienceYears(profileText),
    summary,
  };
};

module.exports = {
  parseLinkedInLikeProfile,
};
