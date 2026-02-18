const calculateScore = ({ matchedSkillsCount, totalRequiredSkills }) => {
  if (!totalRequiredSkills || totalRequiredSkills <= 0) {
    return 0;
  }

  const score = (matchedSkillsCount / totalRequiredSkills) * 100;
  return Math.round(score);
};

module.exports = {
  calculateScore,
};
