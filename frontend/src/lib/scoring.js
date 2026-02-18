export const computeWeightedScore = ({
  skillScore = 0,
  experienceScore = 70,
  projectScore = 65,
  keywordScore = 60,
}) => {
  const weighted =
    (0.4 * skillScore) +
    (0.25 * experienceScore) +
    (0.2 * projectScore) +
    (0.15 * keywordScore);

  return {
    skillScore,
    experienceScore,
    projectScore,
    keywordScore,
    finalScore: Math.round(weighted),
  };
};

export const formatAnalysisDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  return `${Math.round(seconds)}s`;
};
