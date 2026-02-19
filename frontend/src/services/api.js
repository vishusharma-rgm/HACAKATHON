const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const parseSkills = (requiredSkills) => {
  if (Array.isArray(requiredSkills)) {
    return requiredSkills.filter(Boolean).join(',');
  }
  return String(requiredSkills || '').trim();
};

export const analyzeResumeApi = async ({ file, requiredSkills = [] }) => {
  const formData = new FormData();
  formData.append('resume', file);

  const skills = parseSkills(requiredSkills);
  if (skills) {
    formData.append('requiredSkills', skills);
  }

  const response = await fetch(`${API_BASE_URL}/analyze-resume`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details || error.error || 'Resume analysis failed.');
  }

  return response.json();
};

export const generateClaimTestApi = async ({ file, companyIds = [] }) => {
  const formData = new FormData();
  formData.append('resume', file);

  if (Array.isArray(companyIds) && companyIds.length > 0) {
    formData.append('companyIds', companyIds.join(','));
  }

  const response = await fetch(`${API_BASE_URL}/generate-claim-test`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details || error.error || 'Claim test generation failed.');
  }

  return response.json();
};

export const submitClaimTestApi = async ({ testId, answers = [], companyIds = [] }) => {
  const response = await fetch(`${API_BASE_URL}/submit-claim-test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ testId, answers, companyIds }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details || error.error || 'Claim test submission failed.');
  }

  return response.json();
};
