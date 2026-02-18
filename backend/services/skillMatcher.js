const DEFAULT_REQUIRED_SKILLS = [
  "React",
  "Node",
  "MongoDB",
  "System Design",
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const computeSkillMatch = ({ resumeSkills = [], requiredSkills = [] }) => {
  const cleanRequired = (requiredSkills.length ? requiredSkills : DEFAULT_REQUIRED_SKILLS)
    .map((skill) => String(skill).trim())
    .filter(Boolean);

  const resumeSet = new Set(resumeSkills.map(normalize));

  const matchedSkills = cleanRequired.filter((skill) =>
    resumeSet.has(normalize(skill))
  );

  const missingSkills = cleanRequired.filter(
    (skill) => !resumeSet.has(normalize(skill))
  );

  return {
    requiredSkills: cleanRequired,
    matchedSkills,
    missingSkills,
  };
};

module.exports = {
  DEFAULT_REQUIRED_SKILLS,
  computeSkillMatch,
};
