const { analyzeResumeWithAI } = require('./openaiService');

const COMPANY_TEMPLATES = [
  {
    companyId: 'code-orbit',
    companyName: 'CodeOrbit',
    role: 'Backend Developer',
    requiredSkills: [
      { skill: 'Node', weight: 25 },
      { skill: 'Express', weight: 20 },
      { skill: 'MongoDB', weight: 20 },
      { skill: 'SQL', weight: 15 },
      { skill: 'System Design', weight: 20 },
    ],
  },
  {
    companyId: 'pixel-forge',
    companyName: 'PixelForge',
    role: 'Frontend Developer',
    requiredSkills: [
      { skill: 'React', weight: 30 },
      { skill: 'JavaScript', weight: 20 },
      { skill: 'TypeScript', weight: 20 },
      { skill: 'CSS', weight: 15 },
      { skill: 'REST API', weight: 15 },
    ],
  },
  {
    companyId: 'data-sphere',
    companyName: 'DataSphere',
    role: 'Data Analyst',
    requiredSkills: [
      { skill: 'Python', weight: 30 },
      { skill: 'SQL', weight: 30 },
      { skill: 'Statistics', weight: 20 },
      { skill: 'Excel', weight: 20 },
    ],
  },
];

const TEST_STORE = new Map();
const SKILL_DISPLAY_MAP = {
  sql: 'SQL',
  mongodb: 'MongoDB',
  api: 'API',
  dsa: 'DSA',
  aws: 'AWS',
  css: 'CSS',
};
const DEFAULT_TEST_SKILLS = [
  'JavaScript',
  'Node',
  'React',
  'SQL',
  'Git',
];

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const toTitleCase = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => SKILL_DISPLAY_MAP[part] || part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeSkill = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const dedupeSkills = (skills) => {
  const seen = new Set();
  const output = [];

  for (const rawSkill of skills || []) {
    const normalized = normalizeSkill(rawSkill);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(toTitleCase(rawSkill));
  }

  return output;
};

const buildQuestionSetForSkill = (skill) => {
  const key = normalizeSkill(skill);
  const prettySkill = toTitleCase(skill);

  const genericQuestions = [
    {
      type: 'mcq',
      prompt: `Which statement best explains a real-world use of ${prettySkill}?`,
      options: [
        `Applying ${prettySkill} to solve production-level problems with measurable outcomes`,
        `${prettySkill} is only for writing comments and documentation`,
        `${prettySkill} cannot be used in team projects`,
        `${prettySkill} is unrelated to software/product delivery`,
      ],
      correctAnswer: 0,
      weight: 50,
    },
    {
      type: 'mcq',
      prompt: `You claimed ${prettySkill} in your resume. Which behavior shows practical proficiency?`,
      options: [
        `Can explain tradeoffs, debug issues, and deliver small features independently`,
        `Has heard the name but never used it`,
        `Only copied examples without understanding`,
        `Avoids tasks involving ${prettySkill}`,
      ],
      correctAnswer: 0,
      weight: 50,
    },
  ];

  if (key === 'sql') {
    genericQuestions[0] = {
      type: 'mcq',
      prompt: 'Which SQL query returns employees with salary > 50000 sorted descending?',
      options: [
        'SELECT * FROM employees WHERE salary > 50000 ORDER BY salary DESC;',
        'SELECT employees salary > 50000 SORT DESC;',
        'FETCH employees BY salary DESC IF salary > 50000;',
        'ORDER employees DESC WHERE salary > 50000;',
      ],
      correctAnswer: 0,
      weight: 50,
    };
  }

  if (key === 'react') {
    genericQuestions[0] = {
      type: 'mcq',
      prompt: 'In React, which hook is typically used for local component state?',
      options: ['useState', 'useContextProvider', 'setInterval', 'useRoute'],
      correctAnswer: 0,
      weight: 50,
    };
  }

  if (key === 'node') {
    genericQuestions[0] = {
      type: 'mcq',
      prompt: 'What is Node.js primarily used for?',
      options: [
        'Running JavaScript on the server/runtime environment',
        'Styling HTML pages',
        'Designing logos',
        'Creating spreadsheet formulas',
      ],
      correctAnswer: 0,
      weight: 50,
    };
  }

  return genericQuestions.map((question) => ({
    ...question,
    id: uid('q'),
    skill: prettySkill,
  }));
};

const stripAnswerKey = (question) => ({
  id: question.id,
  skill: question.skill,
  type: question.type,
  prompt: question.prompt,
  options: question.options,
  weight: question.weight,
});

const getRequestedCompanies = (companyIds = []) => {
  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    return COMPANY_TEMPLATES;
  }

  const idSet = new Set(companyIds.map((item) => String(item || '').trim().toLowerCase()));
  const matched = COMPANY_TEMPLATES.filter((company) => idSet.has(company.companyId));
  return matched.length > 0 ? matched : COMPANY_TEMPLATES;
};

const buildCompanyShortlist = ({ skillScores = {}, claimedSkills = [], companies = [] }) => {
  const normalizedClaimSet = new Set((claimedSkills || []).map((skill) => normalizeSkill(skill)));

  const result = companies.map((company) => {
    const totalWeight = company.requiredSkills.reduce((sum, item) => sum + item.weight, 0) || 1;
    let weightedTestScore = 0;
    let weightedClaimCoverage = 0;
    let matchedRequirementCount = 0;

    for (const requirement of company.requiredSkills) {
      const normalizedSkill = normalizeSkill(requirement.skill);
      const skillTestScore = Number(skillScores[normalizedSkill] || 0);
      const inResume = normalizedClaimSet.has(normalizedSkill) ? 100 : 0;
      if (inResume > 0) {
        matchedRequirementCount += 1;
      }

      weightedTestScore += skillTestScore * requirement.weight;
      weightedClaimCoverage += inResume * requirement.weight;
    }

    const normalizedTestScore = weightedTestScore / totalWeight;
    const normalizedClaimScore = weightedClaimCoverage / totalWeight;
    const fitScore = Math.round(normalizedTestScore);

    return {
      companyId: company.companyId,
      companyName: company.companyName,
      role: company.role,
      fitScore,
      testScore: Math.round(normalizedTestScore),
      claimCoverage: Math.round(normalizedClaimScore),
      matchedRequirementCount,
    };
  });

  return result
    .filter((company) => company.matchedRequirementCount > 0 && company.claimCoverage > 0)
    .sort((a, b) => b.fitScore - a.fitScore)
    .map(({ matchedRequirementCount, ...company }) => company);
};

const createResumeClaimTest = async ({ resumeText, requestedCompanies = [] }) => {
  const aiResult = await analyzeResumeWithAI({
    resumeText,
    requiredSkills: [],
  });

  const extractedSkills = dedupeSkills(aiResult.extractedSkills);
  const fallbackFromCompanies = dedupeSkills(
    getRequestedCompanies(requestedCompanies)
      .flatMap((company) => company.requiredSkills.map((item) => item.skill))
  );
  const claimedSkills = (
    extractedSkills.length ? extractedSkills :
      (fallbackFromCompanies.length ? fallbackFromCompanies : DEFAULT_TEST_SKILLS)
  ).slice(0, 8);

  const questions = claimedSkills.flatMap((skill) => buildQuestionSetForSkill(skill));
  const testId = uid('test');

  TEST_STORE.set(testId, {
    testId,
    createdAt: new Date().toISOString(),
    claimedSkills,
    questions,
    requestedCompanies,
  });

  return {
    testId,
    claimedSkills,
    questionCount: questions.length,
    questions: questions.map(stripAnswerKey),
  };
};

const evaluateResumeClaimTest = ({ testId, answers = [], requestedCompanies = [] }) => {
  const test = TEST_STORE.get(testId);

  if (!test) {
    throw new Error('Invalid testId or test expired. Please generate a new test.');
  }

  const answerMap = new Map((answers || []).map((item) => [String(item.questionId || ''), Number(item.selectedOption)]));

  const perSkill = {};
  let answeredQuestionCount = 0;

  for (const question of test.questions) {
    const normalizedSkill = normalizeSkill(question.skill);
    if (!perSkill[normalizedSkill]) {
      perSkill[normalizedSkill] = {
        skill: question.skill,
        score: 0,
        totalWeight: 0,
      };
    }

    const selectedOption = answerMap.get(question.id);
    const isAnswered = Number.isInteger(selectedOption) && selectedOption >= 0;
    if (!isAnswered) {
      continue;
    }

    answeredQuestionCount += 1;
    perSkill[normalizedSkill].totalWeight += question.weight;
    if (selectedOption === question.correctAnswer) {
      perSkill[normalizedSkill].score += question.weight;
    }
  }

  const skillScores = {};
  for (const [normalizedSkill, value] of Object.entries(perSkill)) {
    skillScores[normalizedSkill] = value.totalWeight > 0
      ? Math.round((value.score / value.totalWeight) * 100)
      : 0;
  }

  const claimedNormalized = test.claimedSkills.map((skill) => normalizeSkill(skill));
  const authenticityScore = claimedNormalized.length > 0
    ? Math.round(claimedNormalized.reduce((sum, item) => sum + Number(skillScores[item] || 0), 0) / claimedNormalized.length)
    : 0;

  const skillBreakdown = Object.values(perSkill)
    .filter((item) => item.totalWeight > 0)
    .map((item) => ({
      skill: item.skill,
      score: Math.round((item.score / item.totalWeight) * 100),
    }));

  if (answeredQuestionCount === 0) {
    return {
      testId,
      claimStatus: 'not_attempted',
      authenticityScore: 0,
      skillBreakdown: [],
      shortlist: [],
    };
  }

  const companies = getRequestedCompanies(requestedCompanies.length > 0 ? requestedCompanies : test.requestedCompanies);
  const shortlist = buildCompanyShortlist({
    skillScores,
    claimedSkills: test.claimedSkills,
    companies,
  });

  const claimStatus = authenticityScore >= 75
    ? 'strongly_verified'
    : authenticityScore >= 50
      ? 'partially_verified'
      : 'weakly_verified';

  return {
    testId,
    claimStatus,
    authenticityScore,
    skillBreakdown,
    shortlist,
  };
};

module.exports = {
  COMPANY_TEMPLATES,
  createResumeClaimTest,
  evaluateResumeClaimTest,
};
