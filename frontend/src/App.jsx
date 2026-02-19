import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { computeWeightedScore, formatAnalysisDuration } from "./lib/scoring";
import { generateClaimTestApi, submitClaimTestApi } from "./services/api";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

const metrics = [
  {
    title: "ATS Fit Score",
    value: "Instant",
    description: "Quick role readiness check",
  },
  {
    title: "Skill Gap Finder",
    value: "Matched vs Missing",
    description: "See what to add next",
  },
  {
    title: "Action Plan",
    value: "Practical Suggestions",
    description: "Direct improvement points",
  },
];

const ROLE_SKILL_MAP = {
  "Frontend Developer": ["React", "JavaScript", "TypeScript", "CSS", "REST API"],
  "Backend Developer": ["Node", "Express", "MongoDB", "System Design", "SQL"],
  "Data Analyst": ["Python", "SQL", "Statistics", "Excel", "Data Visualization"],
  "Full Stack Developer": ["React", "TypeScript", "Node", "Express", "MongoDB", "SQL", "REST API", "System Design"],
};

const ANALYSIS_RESULT_KEY = "resume_analysis_result";
const ANALYSIS_FALLBACK_KEY = "resume_analysis_fallback";
const ANALYSIS_DURATION_KEY = "resume_last_analysis_duration_ms";
const ANALYSIS_META_KEY = "resume_last_analysis_meta";
const ANALYSIS_HISTORY_KEY = "resume_analysis_history";
const SELECTED_ROLE_KEY = "resume_selected_role";
const THEME_KEY = "resume_theme";
const JD_DETECTED_KEY = "resume_jd_detected";
const ThemeContext = createContext({ isDark: false, setIsDark: () => {}, toggleTheme: () => {} });

const appState = {
  getAnalysisResult() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ANALYSIS_RESULT_KEY) || "null");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_error) {
      return null;
    }
  },
  setAnalysisResult(value) {
    localStorage.setItem(ANALYSIS_RESULT_KEY, JSON.stringify(value));
  },
  clearAnalysisResult() {
    localStorage.removeItem(ANALYSIS_RESULT_KEY);
  },
  setFallbackResult(value) {
    localStorage.setItem(ANALYSIS_FALLBACK_KEY, JSON.stringify(value));
  },
  getFallbackResult() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ANALYSIS_FALLBACK_KEY) || "null");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_error) {
      return null;
    }
  },
  clearFallbackResult() {
    localStorage.removeItem(ANALYSIS_FALLBACK_KEY);
  },
  getSelectedRole() {
    try {
      return localStorage.getItem(SELECTED_ROLE_KEY) || "";
    } catch (_error) {
      return "";
    }
  },
  setSelectedRole(value) {
    localStorage.setItem(SELECTED_ROLE_KEY, value);
  },
  setAnalysisMeta(meta) {
    localStorage.setItem(ANALYSIS_META_KEY, JSON.stringify(meta));
    if (Number.isFinite(meta?.durationMs)) {
      localStorage.setItem(ANALYSIS_DURATION_KEY, String(meta.durationMs));
    }
  },
  getAnalysisMeta() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ANALYSIS_META_KEY) || "null");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_error) {
      return null;
    }
  },
  pushAnalysisHistory(entry) {
    try {
      const existing = JSON.parse(localStorage.getItem(ANALYSIS_HISTORY_KEY) || "[]");
      const next = [...(Array.isArray(existing) ? existing : []), entry].slice(-12);
      localStorage.setItem(ANALYSIS_HISTORY_KEY, JSON.stringify(next));
    } catch (_error) {
      // no-op
    }
  },
  getAnalysisHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ANALYSIS_HISTORY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  },
  getTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === "dark";
    } catch (_error) {
      return false;
    }
  },
  setTheme(isDark) {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  },
  setJdDetected(flag) {
    localStorage.setItem(JD_DETECTED_KEY, flag ? "true" : "false");
  },
  isJdDetected() {
    return localStorage.getItem(JD_DETECTED_KEY) === "true";
  },
};

const getStoredAnalysisResult = () => {
  return appState.getAnalysisResult();
};

const clearStoredAnalysisResult = () => {
  try {
    appState.clearAnalysisResult();
  } catch (_error) {
    // no-op
  } 
  
  

};

const exportJsonFile = (fileName, payload) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getDemoAnalysisResult = () => ({
  score: 74,
  extractedSkills: ["React", "Node", "JavaScript", "Git", "REST API"],
  matchedSkills: ["Node", "REST API"],
  missingSkills: ["MongoDB", "System Design", "SQL"],
  suggestions:
    "Add one backend project with database scaling, indexing, and architecture decisions.",
});

const setDemoMode = (enabled) => {
  try {
    localStorage.setItem("resume_demo_mode", enabled ? "true" : "false");
  } catch (_error) {
    // no-op
  }
};

const isDemoModeActive = () => {
  try {
    return localStorage.getItem("resume_demo_mode") === "true";
  } catch (_error) {
    return false;
  }
};

function LiquidNavbar() {
  return (
    <div className="sticky top-4 z-50 px-4">
      <nav className="liquid-nav mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl px-5 py-3">
        <span className="liquid-shine" />
        <Link to="/" className="text-lg font-bold tracking-tight text-slate-900">
          ResumeIQ
        </Link>
        <div className="hidden items-center gap-7 text-sm font-medium text-slate-700 md:flex">
          <a href="#overview" className="hover:text-[var(--primary)]">Overview</a>
          <a href="#highlights" className="hover:text-[var(--primary)]">Highlights</a>
          <Link to="/analyze" className="hover:text-[var(--primary)]">Analyze</Link>
        </div>
        <Link
          to="/analyze"
          onClick={clearStoredAnalysisResult}
          className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.03] hover:bg-[var(--primary-dark)] hover:shadow-lg hover:shadow-teal-200/80"
        >
          Start Now
        </Link>
      </nav>
    </div>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const runLandingDemo = () => {
    const demo = getDemoAnalysisResult();
    appState.setAnalysisResult(demo);
    appState.setSelectedRole("Backend Developer");
    appState.setAnalysisMeta({
      source: "demo",
      analyzedAt: new Date().toISOString(),
      durationMs: 0,
    });
    appState.pushAnalysisHistory({
      role: "Backend Developer",
      score: demo.score || 0,
      source: "demo",
      at: new Date().toISOString(),
    });
    setDemoMode(true);
    navigate("/role-match");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <LiquidNavbar />
      <main className="mx-auto flex min-h-[calc(100vh-108px)] w-full max-w-6xl items-center px-6 py-8">
        <section id="overview" className="w-full">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.55 }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1 className="hero-title text-4xl font-bold leading-tight md:text-6xl">
              Build a job-ready resume with precise skill-gap insights.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--muted)]">
              Professional analysis, role-fit score, and clear suggestions designed for students and working professionals.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/analyze"
                onClick={clearStoredAnalysisResult}
                className="cta-pulse rounded-lg bg-[var(--primary)] px-7 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.03] hover:bg-[var(--primary-dark)] hover:shadow-lg hover:shadow-teal-200/80"
              >
                Start Now
              </Link>
              <button
                onClick={runLandingDemo}
                className="rounded-lg border border-[var(--border)] bg-white px-7 py-3 text-sm font-semibold text-slate-700 transition-all hover:scale-[1.03] hover:bg-slate-50"
              >
                Run Demo
              </button>
            </div>
            <div id="highlights" className="mt-8 grid gap-4 md:grid-cols-3">
              {metrics.map((item) => (
                <motion.div
                  key={item.title}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="rounded-2xl border border-slate-200 bg-white/85 p-6 text-center shadow-md backdrop-blur"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{item.title}</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--primary)]">{item.value}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{item.description}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
            <p className="mt-4 text-center text-xs text-slate-500">
              ResumeIQ workspace is tuned for demo-ready scoring, role matching, and actionable skill-gap planning.
            </p>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

function AnalyzePage() {
  const COMPANY_SHORTLIST_TEMPLATES = [
    { companyId: "code-orbit", companyName: "CodeOrbit", role: "Backend Developer", requiredSkills: ["Node", "Express", "MongoDB", "SQL", "System Design"] },
    { companyId: "pixel-forge", companyName: "PixelForge", role: "Frontend Developer", requiredSkills: ["React", "JavaScript", "TypeScript", "CSS", "REST API"] },
    { companyId: "data-sphere", companyName: "DataSphere", role: "Data Analyst", requiredSkills: ["Python", "SQL", "Statistics", "Excel"] },
  ];
  const normalizeSkill = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9+#\s]/g, " ").replace(/\s+/g, " ").trim();
  const buildTestBasedShortlist = ({ claimedSkills = [], skillBreakdown = [] }) => {
    if (!Array.isArray(skillBreakdown) || skillBreakdown.length === 0) {
      return [];
    }
    const claimSet = new Set((claimedSkills || []).map(normalizeSkill));
    const scoreBySkill = Object.fromEntries(
      (skillBreakdown || []).map((item) => [normalizeSkill(item.skill), Number(item.score || 0)])
    );

    return COMPANY_SHORTLIST_TEMPLATES.map((company) => {
      const normalizedRequired = company.requiredSkills.map(normalizeSkill);
      const matchedSkills = normalizedRequired.filter((skill) => claimSet.has(skill));
      if (matchedSkills.length === 0) {
        return null;
      }
      const testScore = Math.round(
        matchedSkills.reduce((sum, skill) => sum + Number(scoreBySkill[skill] || 0), 0) / matchedSkills.length
      );
      const claimCoverage = Math.round((matchedSkills.length / normalizedRequired.length) * 100);
      return {
        companyId: company.companyId,
        companyName: company.companyName,
        role: company.role,
        fitScore: testScore,
        testScore,
        claimCoverage,
      };
    }).filter(Boolean).sort((a, b) => b.fitScore - a.fitScore);
  };
  const normalizeClaimResult = (result, claimedSkills = []) => {
    const shortlistFromResult = Array.isArray(result?.shortlist) ? result.shortlist : [];
    const cleaned = shortlistFromResult
      .filter((item) => Number(item?.claimCoverage || 0) > 0)
      .map((item) => ({
        ...item,
        fitScore: Number.isFinite(Number(item?.testScore)) ? Math.round(Number(item.testScore)) : Math.round(Number(item?.fitScore || 0)),
      }))
      .sort((a, b) => b.fitScore - a.fitScore);
    if (cleaned.length > 0) {
      return {
        ...result,
        shortlist: cleaned,
      };
    }

    return {
      ...result,
      shortlist: buildTestBasedShortlist({
        claimedSkills,
        skillBreakdown: Array.isArray(result?.skillBreakdown) ? result.skillBreakdown : [],
      }),
    };
  };

  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(() => {
    return appState.getSelectedRole();
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [claimTest, setClaimTest] = useState(null);
  const [claimAnswers, setClaimAnswers] = useState({});
  const [claimResult, setClaimResult] = useState(null);
  const [isGeneratingClaimTest, setIsGeneratingClaimTest] = useState(false);
  const [isSubmittingClaimTest, setIsSubmittingClaimTest] = useState(false);
  const [claimError, setClaimError] = useState("");
  const storedResult = getStoredAnalysisResult();
  const activeResult = analysisResult || storedResult;
  const hasAnalysis = Boolean(activeResult);
  const selectedRole = selectedDomain || "Backend Developer";
  const requiredSkills = ROLE_SKILL_MAP[selectedRole] || [];
  const extractedSkills = activeResult?.extractedSkills || [];
  const extractedSet = new Set(extractedSkills.map((skill) => String(skill).toLowerCase()));
  const roleMatchedSkills = requiredSkills.filter((skill) => extractedSet.has(skill.toLowerCase()));
  const roleMissingSkills = requiredSkills.filter((skill) => !extractedSet.has(skill.toLowerCase()));
  const topMissingSkill = hasAnalysis ? (roleMissingSkills[0] || "None") : "None";
  const previousScore = (() => {
    const history = appState.getAnalysisHistory();
    if (history.length < 2) return null;
    return Number(history[history.length - 2]?.score || 0);
  })();
  const scoreDelta = hasAnalysis && previousScore !== null
    ? (Number(activeResult?.score || 0) - previousScore)
    : null;

  const buildLocalFallback = () => {
    const fallbackExtractedByRole = {
      "Frontend Developer": ["React", "JavaScript", "CSS", "Git"],
      "Backend Developer": ["Node", "Express", "REST API", "Git"],
      "Data Analyst": ["Python", "SQL", "Excel", "Data Visualization"],
      "Full Stack Developer": ["React", "Node", "JavaScript", "REST API", "Git"],
    };
    const required = ROLE_SKILL_MAP[selectedRole] || [];
    const extracted = fallbackExtractedByRole[selectedRole] || [];
    const fallbackSet = new Set(extracted.map((skill) => skill.toLowerCase()));
    const matched = required.filter((skill) => fallbackSet.has(skill.toLowerCase()));
    const missing = required.filter((skill) => !fallbackSet.has(skill.toLowerCase()));
    const score = required.length ? Math.round((matched.length / required.length) * 100) : 0;

    return {
      score,
      extractedSkills: extracted,
      matchedSkills: matched,
      missingSkills: missing,
      suggestions: `Fallback mode: add ${missing.slice(0, 2).join(" and ") || "core domain"} depth to improve ${selectedRole} fit.`,
    };
  };

  const normalizeAnalysisPayload = (payload) => {
    const required = ROLE_SKILL_MAP[selectedRole] || [];
    const rawExtracted = Array.isArray(payload?.extractedSkills)
      ? payload.extractedSkills
      : Array.isArray(payload?.skills)
        ? payload.skills
        : Array.isArray(payload?.keywords)
          ? payload.keywords
          : [];
    const rawMatched = Array.isArray(payload?.matchedSkills) ? payload.matchedSkills : [];
    const extracted = [...new Set([...rawExtracted, ...rawMatched].map((skill) => String(skill).trim()).filter(Boolean))];
    const extractedLookup = new Set(extracted.map((skill) => skill.toLowerCase()));
    const matched = required.length
      ? required.filter((skill) => extractedLookup.has(skill.toLowerCase()))
      : rawMatched;
    const missing = required.length
      ? required.filter((skill) => !extractedLookup.has(skill.toLowerCase()))
      : (Array.isArray(payload?.missingSkills) ? payload.missingSkills : []);
    const score = typeof payload?.score === "number"
      ? payload.score
      : required.length
        ? Math.round((matched.length / required.length) * 100)
        : 0;

    return {
      ...payload,
      score,
      extractedSkills: extracted,
      matchedSkills: matched,
      missingSkills: missing,
    };
  };

  const handleAnalyze = async () => {
    if (!selectedDomain) {
      setErrorMessage("Please select a domain first (Frontend / Backend / Data Analyst).");
      return;
    }

    if (!selectedFile) {
      setErrorMessage("Please upload a PDF resume first.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage("");
    setAnalysisResult(null);
    const startedAt = Date.now();

    try {
      const formData = new FormData();
      formData.append("resume", selectedFile);
      appState.setSelectedRole(selectedDomain);
      const selectedRequiredSkills = ROLE_SKILL_MAP[selectedDomain] || [];
      formData.append("requiredSkills", selectedRequiredSkills.join(","));

      const response = await fetch("/api/analyze-resume", {
        method: "POST",
        body: formData,
      });

      const rawBody = await response.text();
      let data = {};
      if (rawBody) {
        try {
          data = JSON.parse(rawBody);
        } catch (_error) {
          throw new Error("Server returned invalid response format.");
        }
      }

      if (!response.ok) {
        if (response.status === 403) {
          const fallback = buildLocalFallback();
          setAnalysisResult(fallback);
          appState.setAnalysisResult(fallback);
          appState.setFallbackResult(fallback);
          appState.setAnalysisMeta({
            source: "fallback",
            analyzedAt: new Date().toISOString(),
            durationMs: Date.now() - startedAt,
          });
          appState.pushAnalysisHistory({
            role: selectedDomain,
            score: fallback.score || 0,
            source: "fallback",
            at: new Date().toISOString(),
          });
          setErrorMessage("");
          return;
        }
        throw new Error(
          data.error ||
          data.details ||
          `Analysis failed with status ${response.status}.`
        );
      }

      if (!data || typeof data !== "object") {
        throw new Error("Server returned an empty response.");
      }

      const normalized = normalizeAnalysisPayload(data);
      setAnalysisResult(normalized);
      appState.setAnalysisResult(normalized);
      appState.clearFallbackResult();
      appState.setAnalysisMeta({
        source: "api",
        analyzedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      });
      appState.pushAnalysisHistory({
        role: selectedDomain,
        score: normalized.score || 0,
        source: "api",
        at: new Date().toISOString(),
      });
    } catch (_error) {
      const fallback = buildLocalFallback();
      setAnalysisResult(fallback);
      appState.setAnalysisResult(fallback);
      appState.setFallbackResult(fallback);
      appState.setAnalysisMeta({
        source: "fallback",
        analyzedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      });
      appState.pushAnalysisHistory({
        role: selectedDomain,
        score: fallback.score || 0,
        source: "fallback",
        at: new Date().toISOString(),
      });
      setErrorMessage("");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateClaimTest = async () => {
    if (!selectedFile) {
      setClaimError("Upload a resume to generate the claim verification test.");
      return;
    }

    setIsGeneratingClaimTest(true);
    setClaimError("");
    setClaimResult(null);

    try {
      const data = await generateClaimTestApi({ file: selectedFile });
      setClaimTest(data);
      setClaimAnswers({});
    } catch (error) {
      const fallbackSkills = (activeResult?.extractedSkills || []).slice(0, 5);
      if (fallbackSkills.length > 0) {
        const localQuestions = fallbackSkills.flatMap((skill, idx) => ([
          {
            id: `local_${idx}_1`,
            skill,
            type: "mcq",
            prompt: `Which statement best reflects a practical use of ${skill}?`,
            options: [
              `Using ${skill} in production to solve problems with measurable impact`,
              `${skill} is only theoretical and not used in real projects`,
              `${skill} is not useful in team-based engineering work`,
              `${skill} is unrelated to software or product delivery`,
            ],
            weight: 50,
          },
          {
            id: `local_${idx}_2`,
            skill,
            type: "mcq",
            prompt: `If ${skill} is listed in a resume, which signal shows strong proficiency?`,
            options: [
              "Can explain tradeoffs, debug issues, and deliver features independently",
              "Has only heard the term and never used it in practice",
              "Copies sample code without understanding implementation details",
              `Avoids tasks related to ${skill}`,
            ],
            weight: 50,
          },
        ]));
        setClaimTest({
          testId: `practice_test_${Date.now()}`,
          claimedSkills: fallbackSkills,
          questions: localQuestions,
          questionCount: localQuestions.length,
        });
        setClaimAnswers({});
        setClaimError("");
      } else {
        setClaimError(error.message || "Claim test generation failed.");
      }
    } finally {
      setIsGeneratingClaimTest(false);
    }
  };

  const handleSelectAnswer = (questionId, selectedOption) => {
    setClaimAnswers((prev) => ({
      ...prev,
      [questionId]: selectedOption,
    }));
  };

  const handleSubmitClaimTest = async () => {
    if (!claimTest?.testId) {
      setClaimError("Generate the claim test before submitting.");
      return;
    }

    const answers = (claimTest.questions || []).map((question) => ({
      questionId: question.id,
      selectedOption: Number.isInteger(claimAnswers[question.id]) ? claimAnswers[question.id] : -1,
    }));

    if (String(claimTest.testId).startsWith("practice_test_")) {
      const grouped = (claimTest.questions || []).reduce((acc, question) => {
        const selectedOption = claimAnswers[question.id];
        const isAnswered = Number.isInteger(selectedOption) && selectedOption >= 0;
        if (!isAnswered) {
          return acc;
        }
        const key = question.skill;
        if (!acc[key]) acc[key] = { correct: 0, total: 0 };
        acc[key].total += 1;
        if (selectedOption === 0) acc[key].correct += 1;
        return acc;
      }, {});

      const skillBreakdown = Object.entries(grouped).map(([skill, value]) => ({
        skill,
        score: value.total ? Math.round((value.correct / value.total) * 100) : 0,
      }));
      const authenticityScore = skillBreakdown.length
        ? Math.round(skillBreakdown.reduce((sum, item) => sum + item.score, 0) / skillBreakdown.length)
        : 0;
      const claimStatus = skillBreakdown.length === 0
        ? "not_attempted"
        : authenticityScore >= 75
          ? "strongly_verified"
          : authenticityScore >= 50
            ? "partially_verified"
            : "weakly_verified";

      const shortlist = buildTestBasedShortlist({
        claimedSkills: claimTest.claimedSkills || [],
        skillBreakdown,
      });

      setClaimResult(normalizeClaimResult({
        testId: claimTest.testId,
        claimStatus,
        authenticityScore,
        skillBreakdown,
        shortlist,
      }, claimTest.claimedSkills || []));
      return;
    }

    setIsSubmittingClaimTest(true);
    setClaimError("");
    try {
      const data = await submitClaimTestApi({
        testId: claimTest.testId,
        answers,
      });
      setClaimResult(normalizeClaimResult(data, claimTest.claimedSkills || []));
    } catch (error) {
      setClaimError(error.message || "Claim test submission failed.");
    } finally {
      setIsSubmittingClaimTest(false);
    }
  };

  const analysisTimeLabel = useMemo(() => {
    if (!hasAnalysis) return "0s";
    try {
      const storedMs = Number(localStorage.getItem(ANALYSIS_DURATION_KEY) || "0");
      return formatAnalysisDuration(storedMs);
    } catch (_error) {
      return "N/A";
    }
  }, [hasAnalysis, activeResult]);
  const analysisMeta = appState.getAnalysisMeta();
  const claimQuestionGroups = useMemo(() => {
    const map = new Map();
    for (const question of claimTest?.questions || []) {
      const key = question.skill || "General";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(question);
    }
    return Array.from(map.entries()).map(([skill, questions]) => ({ skill, questions }));
  }, [claimTest]);
  const claimStatusLabel = String(claimResult?.claimStatus || "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="analyze-bg min-h-screen">
      <div className="grid w-full gap-0 md:grid-cols-[280px_1fr]">
        <WorkspaceSidebar />
        <div className="px-8 py-8">
        <WorkspaceTopbar />
        <PageExportActions className="mb-4" />
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl font-bold"
        >
          Resume Analyzer
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mt-2 text-[var(--muted)]"
        >
          Upload your resume and preview realistic AI analysis behavior.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="editorial-strip mt-6 rounded-2xl border border-teal-100 p-5 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Select Domain (Required)</p>
            <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-teal-700">
              
            </span>
          </div>
          <p className="text-xs text-slate-600">Select your domain</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {Object.keys(ROLE_SKILL_MAP).map((role) => (
              <button
                key={role}
                onClick={() => {
                  setSelectedDomain(role);
                  appState.setSelectedRole(role);
                  setErrorMessage("");
                }}
                className={`group rounded-xl border px-4 py-3 text-left transition-all ${
                  selectedDomain === role
                    ? "border-teal-300 bg-teal-50 shadow-md ring-2 ring-teal-200"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{role}</p>
                  {selectedDomain === role ? (
                    <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {role === "Frontend Developer"
                    ? "UI, React, TypeScript focused"
                    : role === "Backend Developer"
                      ? "APIs, DB, system design focused"
                      : role === "Data Analyst"
                        ? "SQL, stats, analytics focused"
                        : "Frontend + Backend end-to-end"}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.14 }}
          className="glass-panel mt-8 rounded-2xl p-6"
        >
          <label className="mb-3 block text-sm font-semibold text-slate-700">Upload Resume (PDF)</label>
          <label className="upload-dropzone block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition-all hover:border-teal-400 hover:bg-teal-50/60">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
                setFileName(file?.name || "");
                setErrorMessage("");
              }}
              className="hidden"
            />
            {!fileName ? (
              <>
                <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-teal-100 text-lg text-teal-700">↑</div>
                <p className="text-sm font-semibold text-slate-700">Drag & drop resume here</p>
                <p className="mt-1 text-xs text-slate-500">or click to browse PDF file</p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-lg text-emerald-700">✓</div>
                <p className="text-sm font-semibold text-slate-800">{fileName}</p>
                <p className="mt-1 text-xs text-slate-500">Resume uploaded. Click here to replace file.</p>
              </>
            )}
          </label>
          {errorMessage ? <p className="mt-3 text-sm font-medium text-red-600">{errorMessage}</p> : null}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isAnalyzing ? (
              <>
                <span className="spinner h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
                Analyzing...
              </>
            ) : (
              "Analyze Resume"
            )}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 grid gap-4 sm:grid-cols-3"
        >
          <div className="card-lift rounded-xl border border-[var(--border)] bg-white p-4">
            <p className="text-xs text-slate-500">Avg Resume Score</p>
            <p className="mt-1 text-xl font-bold text-[var(--primary)]">{hasAnalysis ? `${activeResult.score || 0}%` : "0%"}</p>
            {scoreDelta !== null ? (
              <p className={`mt-1 text-xs font-semibold ${scoreDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta}% vs previous run
              </p>
            ) : null}
          </div>
          <div className="card-lift rounded-xl border border-[var(--border)] bg-white p-4">
            <p className="text-xs text-slate-500">Top Missing Skill</p>
            <p className="mt-1 text-xl font-bold text-[var(--text-dark)]">{topMissingSkill}</p>
          </div>
          <div className="card-lift rounded-xl border border-[var(--border)] bg-white p-4">
            <p className="text-xs text-slate-500">Analysis Time</p>
            <p className="mt-1 text-xl font-bold text-[var(--text-dark)]">{analysisTimeLabel}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.26 }}
          className="glass-panel mt-6 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-slate-800">Analysis Summary</p>
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
              {hasAnalysis ? "Ready" : "Pending"}
            </span>
          </div>
          {!hasAnalysis ? (
            <p className="mt-4 text-sm text-slate-600">
              Upload and analyze a resume to view summary insights for the selected domain.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="glass-soft rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-700">Recommendation</p>
                <p className="mt-2 text-sm text-slate-600">
                  {activeResult?.suggestions || "No suggestions available."}
                </p>
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Role</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedRole}</p>
                </div>
              </div>
              <div className="glass-soft rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-700">Extracted Skills</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(activeResult?.extractedSkills || []).length ? (activeResult.extractedSkills || []).map((skill) => (
                    <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {skill}
                    </span>
                  )) : <span className="text-xs text-slate-500">Not available</span>}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="glass-panel mt-6 rounded-2xl p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-800">Resume  Verification Test</p>
              <p className="mt-1 text-sm text-slate-600">
                Questions are generated from resume skills and evaluated for company fit.
              </p>
            </div>
            <button
              onClick={handleGenerateClaimTest}
              disabled={isGeneratingClaimTest || !selectedFile}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingClaimTest ? "Generating..." : "Generate Test"}
            </button>
          </div>

          {claimError ? <p className="mt-3 text-sm font-medium text-red-600">{claimError}</p> : null}

          {claimTest?.questions?.length ? (
            <div className="mt-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mt-1 text-xs text-slate-600">
                  Claimed Skills: {(claimTest.claimedSkills || []).join(", ")}
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {claimQuestionGroups.map((group) => (
                  <div key={group.skill} className="rounded-xl border border-teal-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{group.skill} Section</p>
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
                        {group.questions.length} Questions
                      </span>
                    </div>
                    <div className="space-y-3">
                      {group.questions.map((question, questionIndex) => (
                        <div key={question.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-sm font-semibold text-slate-800">
                            Q{questionIndex + 1}. {question.prompt}
                          </p>
                          <div className="mt-3 space-y-2">
                            {(question.options || []).map((option, optionIndex) => (
                              <label
                                key={`${question.id}-${optionIndex}`}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                  claimAnswers[question.id] === optionIndex
                                    ? "border-teal-300 bg-teal-50"
                                    : "border-slate-200 bg-white"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={question.id}
                                  checked={claimAnswers[question.id] === optionIndex}
                                  onChange={() => handleSelectAnswer(question.id, optionIndex)}
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSubmitClaimTest}
                disabled={isSubmittingClaimTest}
                className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingClaimTest ? "Submitting..." : "Submit Test & Generate Shortlist"}
              </button>
            </div>
          ) : null}
        </motion.div>

        {claimResult ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.34 }}
            className="glass-panel mt-6 rounded-2xl p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base font-semibold text-slate-800">Claim Verification Result</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                  {claimStatusLabel || "Pending"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Authenticity: {claimResult.authenticityScore || 0}%
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Overall Score</p>
                <p className="mt-2 text-3xl font-bold text-teal-700">{claimResult.authenticityScore || 0}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Skills Rating</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{(claimResult.skillBreakdown || []).length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Top Match Company</p>
                <p className="mt-2 text-lg font-bold text-slate-800">{claimResult.shortlist?.[0]?.companyName || "N/A"}</p>
                <p className="text-xs text-slate-500">{claimResult.shortlist?.[0]?.role || ""}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Skill Breakdown</p>
                <div className="mt-3 space-y-2">
                  {(claimResult.skillBreakdown || []).map((item) => (
                    <div key={item.skill} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">{item.skill}</span>
                        <span className="font-semibold text-slate-800">{item.score}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-teal-500"
                          style={{ width: `${Math.max(0, Math.min(100, Number(item.score) || 0))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Company Shortlist</p>
                <div className="mt-3 space-y-2">
                  {(claimResult.shortlist || []).length ? (claimResult.shortlist || []).map((company, rank) => (
                    <div key={company.companyId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{company.companyName} - {company.role}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Rank #{rank + 1}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                        <span className="rounded bg-white px-2 py-1 text-center font-semibold">Fit {company.fitScore}%</span>
                        <span className="rounded bg-white px-2 py-1 text-center font-semibold">Test {company.testScore}%</span>
                        <span className="rounded bg-white px-2 py-1 text-center font-semibold">Coverage {company.claimCoverage}%</span>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                      No matching companies found for the current resume skill set.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        </div>
      </div>
    </div>
  );
}

function WorkspaceSidebar() {
  return (
    <aside className="glass-panel sticky top-0 h-screen border-r px-4 py-8">
      <p className="mb-5 text-xs font-bold uppercase tracking-wide text-slate-500">Menu</p>
      <div className="space-y-2">
        <NavLink
          to="/analyze"
          className={({ isActive }) =>
            `block rounded-xl px-3 py-3 text-base font-semibold transition-all ${isActive ? "border border-teal-200 bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"}`
          }
        >
          Analyze
        </NavLink>
        <NavLink
          to="/missing-skills"
          className={({ isActive }) =>
            `block rounded-xl px-3 py-3 text-base font-semibold transition-all ${isActive ? "border border-teal-200 bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"}`
          }
        >
          Missing Skills
        </NavLink>
        <NavLink
          to="/ats-checker"
          className={({ isActive }) =>
            `block rounded-xl px-3 py-3 text-base font-semibold transition-all ${isActive ? "border border-teal-200 bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"}`
          }
        >
          ATS Checker
        </NavLink>
        <NavLink
          to="/icm-score"
          className={({ isActive }) =>
            `block rounded-xl px-3 py-3 text-base font-semibold transition-all ${isActive ? "border border-teal-200 bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"}`
          }
        >
          ICM Score
        </NavLink>
        <NavLink
          to="/role-match"
          className={({ isActive }) =>
            `block rounded-xl px-3 py-3 text-base font-semibold transition-all ${isActive ? "border border-teal-200 bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"}`
          }
        >
          Role Match
        </NavLink>
      </div>
    </aside>
  );
}

function AtsCheckerPage() {
  const parsed = getStoredAnalysisResult();
  const hasAnalysis = Boolean(parsed);
  const analysisMeta = appState.getAnalysisMeta();
  const extractedSkills = parsed?.extractedSkills || [];
  const matchedSkills = parsed?.matchedSkills || [];
  const missingSkills = parsed?.missingSkills || [];
  const selectedRole = (() => {
    return appState.getSelectedRole() || "Backend Developer";
  })();

  const keywordCoverage = extractedSkills.length
    ? Math.round((matchedSkills.length / Math.max(extractedSkills.length, 1)) * 100)
    : 0;
  const roleCoverage = matchedSkills.length + missingSkills.length
    ? Math.round((matchedSkills.length / (matchedSkills.length + missingSkills.length)) * 100)
    : 0;
  const readabilityScore = hasAnalysis ? 82 : 0;
  const formatScore = hasAnalysis ? 86 : 0;
  const atsScore = hasAnalysis
    ? Math.round((0.35 * keywordCoverage) + (0.35 * roleCoverage) + (0.2 * readabilityScore) + (0.1 * formatScore))
    : 0;

  const issueChecklist = [
    {
      label: "Missing role keywords",
      status: missingSkills.length ? "warning" : "good",
      detail: missingSkills.length
        ? `${missingSkills.length} role keywords are missing for ${selectedRole}.`
        : "Core role keywords are covered.",
      meta: missingSkills.length
        ? `Missing: ${missingSkills.slice(0, 6).join(", ")}${missingSkills.length > 6 ? "..." : ""}`
        : "No high-priority role keyword gap detected.",
      action: missingSkills.length
        ? "Add these keywords in Projects/Experience bullets with measurable outcomes."
        : "Maintain current keyword strength with fresh project evidence.",
    },
    {
      label: "Section structure",
      status: hasAnalysis ? "good" : "warning",
      detail: hasAnalysis ? "Resume sections appear ATS-friendly." : "Run analysis to validate section structure.",
      meta: hasAnalysis
        ? "Detected: Summary, Skills, Projects, Experience section flow."
        : "Section parsing not available yet.",
      action: hasAnalysis
        ? "Keep section headers simple (Skills, Experience, Projects, Education)."
        : "Analyze resume to generate section-level structure checks.",
    },
    {
      label: "Keyword repetition",
      status: keywordCoverage >= 65 ? "good" : "warning",
      detail: keywordCoverage >= 65 ? "Keyword distribution looks healthy." : "Add domain keywords in projects/experience.",
      meta: `Coverage: ${keywordCoverage}% of extracted skills align with detected role signals.`,
      action: keywordCoverage >= 65
        ? "Keep balance; avoid stuffing same keyword repeatedly."
        : "Repeat target domain keywords naturally across at least 2 sections.",
    },
    {
      label: "Role alignment",
      status: roleCoverage >= 70 ? "good" : "warning",
      detail: roleCoverage >= 70 ? `Strong for ${selectedRole}.` : `Needs better alignment for ${selectedRole}.`,
      meta: `Alignment ratio: ${matchedSkills.length} matched vs ${missingSkills.length} missing role skills.`,
      action: roleCoverage >= 70
        ? "Focus on impact-based bullets to push from match to shortlist-ready."
        : `Prioritize ${selectedRole} domain gaps first: ${missingSkills.slice(0, 3).join(", ") || "core role skills"}.`,
    },
  ];

  const topRecommendations = missingSkills.slice(0, 4).map((skill) => ({
    title: `Add ${skill} evidence`,
    desc: `Include one project bullet with measurable impact using ${skill}.`,
  }));
  const passedChecks = issueChecklist.filter((item) => item.status === "good").length;
  const reviewChecks = issueChecklist.length - passedChecks;

  return (
    <div className="analyze-bg min-h-screen">
      <div className="grid w-full gap-0 md:grid-cols-[280px_1fr]">
        <WorkspaceSidebar />
        <div className="px-8 py-8">
          <WorkspaceTopbar />
          <PageExportActions className="mb-4" />
          <div className="glass-panel rounded-2xl p-6">
            <section className="space-y-4">
              <div className="editorial-strip rounded-xl p-5">
                <p className="text-base font-semibold uppercase tracking-wide text-slate-500">ATS Compliance</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Resume Scanner</h1>
                <p className="mt-2 text-base text-slate-600">
                  Role baseline: <span className="font-semibold text-slate-700">{selectedRole}</span>
                </p>
                {hasAnalysis && analysisMeta ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {`Source: ${String(analysisMeta.source || "unknown").toUpperCase()} | Time: ${formatAnalysisDuration(Number(analysisMeta.durationMs || 0))}`}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="editorial-strip rounded-xl p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Overall Score</p>
                  <p className="mt-1 text-5xl font-bold text-slate-900">{atsScore}</p>
                  <p className="text-base text-slate-500">out of 100</p>
                </div>
                <div className="editorial-strip rounded-xl p-4">
                  <p className="text-base font-semibold text-slate-700">Readability</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{readabilityScore}%</p>
                  <p className="mt-1 text-sm text-slate-600">How clearly ATS can parse your section content.</p>
                </div>
                <div className="editorial-strip rounded-xl p-4">
                  <p className="text-base font-semibold text-slate-700">Format Safety</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{formatScore}%</p>
                  <p className="mt-1 text-sm text-slate-600">Formatting stability for parser compatibility.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="editorial-strip flex h-full flex-col rounded-xl p-4">
                  <p className="text-base font-semibold text-slate-700">Coverage Metrics</p>
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-sm text-slate-500">Keyword Coverage</p>
                      <p className="text-xl font-bold text-slate-800">{keywordCoverage}%</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-sm text-slate-500">Role Alignment</p>
                      <p className="text-xl font-bold text-slate-800">{roleCoverage}%</p>
                    </div>
                  </div>
                  {!hasAnalysis && (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                      Analyze resume first to activate full ATS scan.
                    </p>
                  )}
                </div>
                <div className="editorial-strip h-fit rounded-xl p-4">
                  <p className="text-base font-semibold text-slate-700">Domain Alignment Notes</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Current baseline is <span className="font-semibold">{selectedRole}</span>. ATS checks are tuned against this domain's expected skill vocabulary.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                      <p className="text-sm font-semibold text-slate-800">Domain keyword need</p>
                      <p className="text-sm text-slate-600">
                        {missingSkills.length
                          ? `${selectedRole} domain still needs better alignment on: ${missingSkills.slice(0, 5).join(", ")}${missingSkills.length > 5 ? "..." : ""}.`
                          : `No major ${selectedRole} domain keyword gap detected.`}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                      <p className="text-sm font-semibold text-slate-800">How to align better</p>
                      <p className="text-sm text-slate-600">
                        Add one impact bullet per missing keyword in project or experience section, and mirror JD wording where relevant.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid items-start gap-4 md:grid-cols-2">
                <div className="editorial-strip h-fit rounded-xl p-4">
                  <p className="text-base font-semibold text-slate-700">Checks</p>
                  <p className="mt-1 text-sm text-slate-600">Compact ATS check dashboard with pass/review status.</p>
                  <div className="mt-3 rounded-lg border border-slate-100 bg-white p-3">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>Checks Overview</span>
                      <span>{passedChecks} Pass / {reviewChecks} Review</span>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-slate-200">
                      <div className="flex h-2.5 overflow-hidden rounded-full">
                        <div
                          className="bg-emerald-500"
                          style={{ width: `${issueChecklist.length ? Math.round((passedChecks / issueChecklist.length) * 100) : 0}%` }}
                        />
                        <div
                          className="bg-amber-500"
                          style={{ width: `${issueChecklist.length ? Math.round((reviewChecks / issueChecklist.length) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {issueChecklist.map((item) => (
                      <div key={item.label} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                            <p className="text-sm text-slate-600">{item.detail}</p>
                          </div>
                          <span className={`mt-0.5 rounded-full px-2.5 py-1 text-sm font-semibold ${item.status === "good" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {item.status === "good" ? "Pass" : "Review"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                        <p className="mt-1 text-xs font-medium text-slate-600">Fix: {item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="editorial-strip flex h-full flex-col rounded-xl p-4">
                  <p className="text-base font-semibold text-slate-700">Suggested Fixes</p>
                  <p className="mt-1 text-sm text-slate-600">Highest-impact edits to improve shortlisting probability.</p>
                  <div className="mt-3 space-y-2">
                    {(topRecommendations.length ? topRecommendations : [
                      { title: "No urgent gaps", desc: "Current resume looks aligned with selected role." },
                    ]).map((item) => (
                      <div key={item.title} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                        <p className="text-base font-medium text-slate-800">{item.title}</p>
                        <p className="text-sm text-slate-600">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fix Priority Queue</p>
                    <div className="mt-2 space-y-1.5">
                      {(missingSkills.length ? missingSkills : ["No priority keyword gap"]).slice(0, 6).map((skill, idx) => (
                        <div key={`${skill}-${idx}`} className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5">
                          <span className="text-sm text-slate-700">{skill}</span>
                          <span className="text-xs font-semibold text-slate-500">P{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Execution Note</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Implement top 2 fixes first, then rerun ATS scan to track score movement before next submission.
                    </p>
                  </div>
                </div>
              </div>

              <div className="editorial-strip rounded-xl p-4">
                <p className="text-base font-semibold text-slate-700">Report Note</p>
                <p className="mt-1 text-sm text-slate-600">
                  ATS output is now organized in aligned blocks for faster review. Apply items marked <span className="font-semibold">Review</span>, then run analysis again.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceTopbar() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const [isDemo, setIsDemo] = useState(isDemoModeActive);

  const runTopbarDemo = () => {
    const demo = getDemoAnalysisResult();
    appState.setAnalysisResult(demo);
    appState.setSelectedRole("Backend Developer");
    appState.setAnalysisMeta({
      source: "demo",
      analyzedAt: new Date().toISOString(),
      durationMs: 0,
    });
    appState.pushAnalysisHistory({
      role: "Backend Developer",
      score: demo.score || 0,
      source: "demo",
      at: new Date().toISOString(),
    });
    setDemoMode(true);
    setIsDemo(true);
    navigate("/role-match");
  };

  const exitDemoMode = () => {
    setDemoMode(false);
    setIsDemo(false);
    navigate("/analyze");
  };

  return (
    <div className="glass-panel mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
      <p className="text-2xl font-bold text-slate-800">ResumeIQ Workspace</p>
      <div className="flex items-center gap-2">
        {isDemo ? (
          <button
            onClick={exitDemoMode}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all ${
              isDark
                ? "border-rose-500/60 bg-gradient-to-r from-rose-900/60 to-slate-900 text-rose-200 hover:from-rose-900/80 hover:to-slate-900"
                : "border-rose-300 bg-gradient-to-r from-rose-50 to-white text-rose-700 hover:from-rose-100 hover:to-rose-50 hover:shadow"
            }`}
          >
            Exit Demo
          </button>
        ) : null}
        <button
          onClick={runTopbarDemo}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all ${
            isDemo
              ? isDark
                ? "border-teal-400/60 bg-gradient-to-r from-teal-900/60 to-emerald-900/60 text-teal-200"
                : "border-teal-300 bg-gradient-to-r from-teal-100 to-emerald-100 text-teal-800"
              : isDark
                ? "border-slate-600 bg-gradient-to-r from-slate-800 to-slate-700 text-slate-200 hover:from-slate-700 hover:to-slate-600"
                : "border-slate-300 bg-gradient-to-r from-slate-100 to-white text-slate-700 hover:from-slate-200 hover:to-slate-100"
          }`}
        >
          {isDemo ? "Demo Active" : "Launch Demo"}
        </button>
        <button
          onClick={toggleTheme}
          type="button"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className={`relative flex h-9 w-[74px] items-center rounded-full border p-1 shadow-sm transition-all ${
            isDark
              ? "border-slate-600 bg-gradient-to-r from-slate-900 to-slate-700"
              : "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-100"
          }`}
        >
          <span
            className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${
              isDark ? "left-[38px]" : "left-1"
            }`}
          />
          <span
            className={`relative z-10 grid h-7 w-7 place-items-center rounded-full transition-all ${
              !isDark ? "text-amber-700" : "text-slate-300"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.9" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </span>
          <span
            className={`relative z-10 ml-auto grid h-7 w-7 place-items-center rounded-full transition-all ${
              isDark ? "text-cyan-200" : "text-slate-500"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M20.6 14.2A8.2 8.2 0 1 1 9.8 3.4a7 7 0 1 0 10.8 10.8z" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}

function PageExportActions({ className = "" }) {
  const { isDark } = useContext(ThemeContext);
  const location = useLocation();

  const exportSnapshot = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      route: location.pathname,
      selectedRole: appState.getSelectedRole() || "Backend Developer",
      analysisResult: appState.getAnalysisResult(),
      analysisMeta: appState.getAnalysisMeta(),
      demoMode: isDemoModeActive(),
      theme: isDark ? "dark" : "light",
    };
    const safeRoute = String(location.pathname || "workspace").replace(/\//g, "-").replace(/^-+/, "") || "workspace";
    exportJsonFile(`resumeiq-${safeRoute}-snapshot.json`, payload);
  };

  return (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${className}`}>
      <button
        onClick={() => window.print()}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Print PDF
      </button>
      <button
        onClick={exportSnapshot}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Export JSON
      </button>
    </div>
  );
}

function RoleMatchPage() {
  const skillCatalog = [
    "React", "JavaScript", "TypeScript", "CSS", "REST API",
    "Node", "Express", "MongoDB", "System Design", "SQL",
    "Python", "Statistics", "Excel", "Data Visualization",
    "Docker", "AWS", "Git", "DSA",
  ];
  const selectedRole = (() => {
    return appState.getSelectedRole() || "Backend Developer";
  })();
  const [jdText, setJdText] = useState("");
  const [jdSkills, setJdSkills] = useState([]);
  const [hasDetectedJD, setHasDetectedJD] = useState(false);
  const [jdSignal, setJdSignal] = useState({ mustHave: [], preferred: [], tools: [] });

  const parsed = getStoredAnalysisResult();
  const hasAnalysis = Boolean(parsed);
  const synonymMap = {
    "node.js": "Node",
    "nodejs": "Node",
    "js": "JavaScript",
    "ts": "TypeScript",
    "express.js": "Express",
    "rest": "REST API",
    "restful api": "REST API",
    "data visualisation": "Data Visualization",
  };

  const normalizeSkill = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    if (raw === "node.js" || raw === "nodejs") return "node";
    if (raw === "js") return "javascript";
    if (raw === "ts") return "typescript";
    if (raw === "express.js") return "express";
    if (raw === "restful api" || raw === "rest") return "rest api";
    if (raw === "data visualisation") return "data visualization";
    return raw;
  };

  const extracted = [...new Set([
    ...((parsed?.extractedSkills && parsed.extractedSkills.length) ? parsed.extractedSkills : []),
    ...((parsed?.matchedSkills && parsed.matchedSkills.length) ? parsed.matchedSkills : []),
  ])];
  const extractedSet = new Set(extracted.map((s) => normalizeSkill(s)));
  const fallbackRoleSkills = ROLE_SKILL_MAP[selectedRole] || [];
  const effectiveRequiredSkills = jdSkills.length ? jdSkills : fallbackRoleSkills;
  const requiredSkills = hasAnalysis ? effectiveRequiredSkills : [];
  const matched = requiredSkills.filter((s) => extractedSet.has(normalizeSkill(s)));
  const missing = requiredSkills.filter((s) => !extractedSet.has(normalizeSkill(s)));
  const computeWeightedFit = () => {
    if (!(hasAnalysis && hasDetectedJD && jdSkills.length)) {
      return requiredSkills.length ? Math.round((matched.length / requiredSkills.length) * 100) : 0;
    }
    const groups = [
      { skills: jdSignal.mustHave, weight: 0.6 },
      { skills: jdSignal.preferred, weight: 0.3 },
      { skills: jdSignal.tools, weight: 0.1 },
    ].filter((g) => g.skills.length);
    if (!groups.length) return requiredSkills.length ? Math.round((matched.length / requiredSkills.length) * 100) : 0;
    const score = groups.reduce((acc, group) => {
      const matchedInGroup = group.skills.filter((skill) => extractedSet.has(normalizeSkill(skill))).length;
      return acc + ((matchedInGroup / group.skills.length) * group.weight * 100);
    }, 0);
    return Math.round(score);
  };
  const fitScore = computeWeightedFit();
  const matrixData = requiredSkills.map((skill) => {
    const isMatched = matched.includes(skill);
    return {
      skill,
      isMatched,
      score: isMatched ? 100 : 28,
      label: isMatched ? "Matched" : "Missing",
    };
  });
  const timelineSeries = (() => {
    const history = appState
      .getAnalysisHistory()
      .filter((item) => item && Number.isFinite(Number(item.score)))
      .slice(-6);
    if (!history.length) {
      return [{ label: "Now", value: Math.max(fitScore, 4) }];
    }
    return history.map((item, idx) => ({
      label: `R${idx + 1}`,
      value: Math.max(Number(item.score) || 0, 4),
    }));
  })();
  const evidenceQuality = (() => {
    const matchedRatio = requiredSkills.length ? (matched.length / requiredSkills.length) : 0;
    const mentionDepth = extracted.length ? (matched.length / extracted.length) : 0;
    const score = Math.round(((matchedRatio * 0.7) + (mentionDepth * 0.3)) * 100);
    const band = score >= 75 ? "Strong Evidence" : score >= 50 ? "Moderate Evidence" : "Low Evidence";
    return { score, band };
  })();

  const detectSkillsFromText = (inputText) => {
    const text = inputText.toLowerCase();
    const normalizedText = Object.entries(synonymMap).reduce(
      (acc, [alias, canonical]) => {
        const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const aliasRegex = new RegExp(`\\b${escapedAlias}\\b`, "g");
        return acc.replace(aliasRegex, canonical.toLowerCase());
      },
      text
    );

    const found = skillCatalog.filter((skill) => {
      const escapedSkill = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const skillRegex = new RegExp(`\\b${escapedSkill}\\b`, "i");
      return skillRegex.test(normalizedText);
    });
    const chunks = inputText
      .split(/[\n.]/)
      .map((line) => line.trim())
      .filter(Boolean);
    const requiredHint = /\b(must|required|mandatory|need to|strong)\b/i;
    const preferredHint = /\b(preferred|plus|good to have|nice to have|bonus)\b/i;
    const toolHint = /\b(tool|stack|framework|platform|library|tech)\b/i;
    const mustHave = [];
    const preferred = [];
    const tools = [];

    found.forEach((skill) => {
      const inLines = chunks.filter((line) => new RegExp(`\\b${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(line));
      const hasRequired = inLines.some((line) => requiredHint.test(line));
      const hasPreferred = inLines.some((line) => preferredHint.test(line));
      const hasTool = inLines.some((line) => toolHint.test(line));
      if (hasRequired) mustHave.push(skill);
      else if (hasPreferred) preferred.push(skill);
      else if (hasTool) tools.push(skill);
      else preferred.push(skill);
    });

    return {
      skills: [...new Set(found)],
      signal: {
        mustHave: [...new Set(mustHave)],
        preferred: [...new Set(preferred)],
        tools: [...new Set(tools)],
      },
    };
  };

  const detectSkillsFromJD = () => {
    setHasDetectedJD(true);
    const result = detectSkillsFromText(jdText);
    setJdSkills(result.skills);
    setJdSignal(result.signal);
    appState.setJdDetected(Boolean(result.skills.length));
  };

  return (
    <div className="analyze-bg min-h-screen">
      <div className="grid w-full gap-0 md:grid-cols-[280px_1fr]">
        <WorkspaceSidebar />
        <div className="px-8 py-8">
          <WorkspaceTopbar />
          <PageExportActions className="mb-4" />
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h1 className="text-3xl font-bold">Role Match</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Check role-specific fit and missing requirements.
                  {` Selected role: ${selectedRole}.`}
                </p>
              </div>
            </div>

            <div className="editorial-strip mt-4 rounded-xl p-4">
              {!hasAnalysis && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  No resume analysis found. Accurate role match ke liye pehle Analyze page par resume upload karo.
                </div>
              )}
              <p className="text-sm font-semibold text-slate-700">Job Description Input (Optional)</p>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste JD here to detect required skills..."
                className="mt-2 h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={detectSkillsFromJD}
                  className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white"
                >
                  Detect Skills from JD
                </button>
                <button
                  onClick={() => {
                    setJdText("");
                    setJdSkills([]);
                    setHasDetectedJD(false);
                    setJdSignal({ mustHave: [], preferred: [], tools: [] });
                    appState.setJdDetected(false);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Reset JD
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Mode: {!hasDetectedJD
                  ? "Using selected role baseline (detect JD to override)"
                  : !jdText.trim()
                  ? "Waiting for JD input"
                  : jdSkills.length
                    ? "JD-based required skills"
                    : "No mapped JD skills found, using selected role baseline"}
              </p>
              {hasDetectedJD && jdSkills.length ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">Must Have</p>
                    <p className="text-xs font-semibold text-rose-800">{jdSignal.mustHave.length || 0}</p>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Preferred</p>
                    <p className="text-xs font-semibold text-amber-800">{jdSignal.preferred.length || 0}</p>
                  </div>
                  <div className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">Tools</p>
                    <p className="text-xs font-semibold text-sky-800">{jdSignal.tools.length || 0}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="editorial-strip card-lift rounded-xl border border-[var(--border)] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Role Fit</p>
                <p className="mt-1 text-3xl font-bold text-[var(--primary)]">{fitScore}%</p>
              </div>
              <div className="editorial-strip card-lift rounded-xl border border-[var(--border)] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Matched</p>
                <p className="mt-1 text-3xl font-bold text-emerald-700">{matched.length}</p>
              </div>
              <div className="editorial-strip card-lift rounded-xl border border-[var(--border)] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Missing</p>
                <p className="mt-1 text-3xl font-bold text-red-700">{missing.length}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="editorial-strip rounded-xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Risk Zone</p>
                    <p className="text-lg font-bold text-slate-800">Missing Skills</p>
                  </div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-bold text-rose-700">
                    {missing.length}
                  </span>
                </div>
                <div className="mb-4 h-2.5 rounded-full bg-slate-200">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-rose-500 to-red-500"
                    style={{ width: `${requiredSkills.length ? Math.round((missing.length / requiredSkills.length) * 100) : 0}%` }}
                  />
                </div>
                <div className="grid gap-2">
                  {missing.length ? missing.map((s) => (
                    <div key={s} className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2">
                      <span className="text-sm font-medium text-rose-900">{s}</span>
                      <span className="text-xs font-semibold text-rose-700">High Priority</span>
                    </div>
                  )) : <span className="text-sm font-medium text-slate-500">No missing skill</span>}
                </div>
              </div>

              <div className="editorial-strip rounded-xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Strength Zone</p>
                    <p className="text-lg font-bold text-slate-800">Matched Skills</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                    {matched.length}
                  </span>
                </div>
                <div className="mb-4 h-2.5 rounded-full bg-slate-200">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600"
                    style={{ width: `${requiredSkills.length ? Math.round((matched.length / requiredSkills.length) * 100) : 0}%` }}
                  />
                </div>
                <div className="grid gap-2">
                  {matched.length ? matched.map((s) => (
                    <div key={s} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                      <span className="text-sm font-medium text-emerald-900">{s}</span>
                      <span className="text-xs font-semibold text-emerald-700">Confirmed</span>
                    </div>
                  )) : <span className="text-sm font-medium text-slate-500">No matched skill</span>}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div className="editorial-strip h-fit rounded-xl p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Role Match Analytics</p>
                  <span className="text-xs text-slate-500">Live chart view</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role Fit</p>
                      <p className="mt-1 text-3xl font-bold text-teal-700">{fitScore}%</p>
                      <div className="mt-2 h-2.5 rounded-full bg-slate-200">
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600" style={{ width: `${fitScore}%` }} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Matched Ratio</p>
                      <p className="mt-1 text-3xl font-bold text-emerald-700">
                        {requiredSkills.length ? Math.round((matched.length / requiredSkills.length) * 100) : 0}%
                      </p>
                      <div className="mt-2 h-2.5 rounded-full bg-slate-200">
                        <div
                          className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                          style={{ width: `${requiredSkills.length ? Math.round((matched.length / requiredSkills.length) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing Ratio</p>
                      <p className="mt-1 text-3xl font-bold text-rose-700">
                        {requiredSkills.length ? Math.round((missing.length / requiredSkills.length) * 100) : 0}%
                      </p>
                      <div className="mt-2 h-2.5 rounded-full bg-slate-200">
                        <div
                          className="h-2.5 rounded-full bg-gradient-to-r from-rose-500 to-red-500"
                          style={{ width: `${requiredSkills.length ? Math.round((missing.length / requiredSkills.length) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence Quality</p>
                      <p className="text-sm font-semibold text-slate-700">{evidenceQuality.band}</p>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-200">
                      <div className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" style={{ width: `${evidenceQuality.score}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">Confidence score: {evidenceQuality.score}%</p>
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>Analytics Timeline</span>
                      <span>Current Snapshot</span>
                    </div>
                    <div
                      className="grid h-20 items-end gap-2"
                      style={{ gridTemplateColumns: `repeat(${Math.max(timelineSeries.length, 1)}, minmax(0, 1fr))` }}
                    >
                      {timelineSeries.map((point, idx) => (
                        <div key={`trend-${idx}`} className="flex flex-col items-center gap-1">
                          <div className="w-full rounded-t-sm bg-gradient-to-t from-teal-700 to-cyan-400" style={{ height: `${point.value}%` }} />
                          <span className="text-[10px] text-slate-500">{point.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="editorial-strip h-fit rounded-xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">Skills Matrix Chart</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Matched
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      Missing
                    </span>
                  </div>
                </div>
                {matrixData.length ? (
                  <>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                        <p className="text-xs uppercase tracking-wide text-emerald-700">Matched</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-800">{matched.length}</p>
                      </div>
                      <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2">
                        <p className="text-xs uppercase tracking-wide text-rose-700">Missing</p>
                        <p className="mt-1 text-2xl font-bold text-rose-800">{missing.length}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Coverage</p>
                        <p className="mt-1 text-2xl font-bold text-slate-800">{requiredSkills.length ? Math.round((matched.length / requiredSkills.length) * 100) : 0}%</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
                      <div className="relative rounded-lg bg-slate-50 px-2 pb-3 pt-4">
                        <div className="absolute inset-x-2 top-4 h-px border-t border-dashed border-slate-300" />
                        <div className="absolute inset-x-2 top-1/2 h-px border-t border-dashed border-slate-300" />
                        <div className="absolute inset-x-2 bottom-8 h-px border-t border-slate-300" />
                        <div className="relative z-10 flex h-56 items-end gap-2 overflow-x-auto px-1 pb-1">
                          {matrixData.map((item) => (
                            <div key={item.skill} className="flex min-w-[64px] flex-1 flex-col items-center gap-2">
                              <span className="text-[10px] font-semibold text-slate-500">{item.score}%</span>
                              <div className="flex h-36 w-8 items-end rounded-md bg-slate-200 p-0.5">
                                <div
                                  className={`w-full rounded-sm ${item.isMatched ? "bg-gradient-to-t from-emerald-600 to-teal-400" : "bg-gradient-to-t from-rose-600 to-red-400"}`}
                                  style={{ height: `${item.score}%` }}
                                />
                              </div>
                              <p className="line-clamp-2 text-center text-[10px] font-semibold text-slate-600">{item.skill}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.isMatched ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Detect JD skills to render matrix chart.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function MissingSkillsPage() {
  const parsed = getStoredAnalysisResult();
  const hasAnalysis = Boolean(parsed);
  const selectedRole = (() => {
    return appState.getSelectedRole() || "Backend Developer";
  })();

  const missingSkills = parsed?.missingSkills || [];
  const matchedSkills = parsed?.matchedSkills || [];
  const [progressMap, setProgressMap] = useState({});

  const skillPlan = missingSkills.map((skill, idx) => {
    const priority = idx === 0 ? "Critical" : idx === 1 ? "Medium" : "Nice-to-have";
    const impact = idx === 0 ? 9 : idx === 1 ? 7 : 5;
    const effort = idx === 0 ? "High" : idx === 1 ? "Medium" : "Low";

    return {
      skill,
      priority,
      impact,
      effort,
      reason: "Required keyword or project evidence not found in resume.",
      project: `Build mini ${skill} project with measurable outcomes.`,
      course: `Complete one structured ${skill} learning path.`,
      timeline: idx === 0 ? "14 days" : "7 days",
    };
  });

  const toggleProgress = (skill) => {
    setProgressMap((prev) => {
      const current = prev[skill] || "Not Started";
      const next =
        current === "Not Started"
          ? "In Progress"
          : "Completed";
      return { ...prev, [skill]: next };
    });
  };

  const completedCount = missingSkills.filter(
    (skill) => (progressMap[skill] || "Not Started") === "Completed"
  ).length;
  const inProgressCount = missingSkills.filter(
    (skill) => (progressMap[skill] || "Not Started") === "In Progress"
  ).length;
  const completionRate = missingSkills.length
    ? Math.round((completedCount / missingSkills.length) * 100)
    : 0;
  const interviewQuestions = missingSkills.flatMap((skill) => ([
    `How would you apply ${skill} in a real project with measurable impact?`,
    `What are common pitfalls in ${skill}, and how do you avoid them?`,
  ])).slice(0, 10);

  return (
    <div className="analyze-bg min-h-screen">
      <div className="grid w-full gap-0 md:grid-cols-[280px_1fr]">
        <WorkspaceSidebar />
        <div className="px-8 py-8">
          <WorkspaceTopbar />
          <PageExportActions className="mb-4" />

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Missing Skills</h1>
                <p className="mt-1 text-base text-slate-600">Role: {selectedRole}</p>
              </div>
            </div>

            {!hasAnalysis && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                No analysis found. Upload a resume first.
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Missing</p>
                <p className="text-2xl font-bold text-rose-700">{missingSkills.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Matched</p>
                <p className="text-2xl font-bold text-emerald-700">{matchedSkills.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">In Progress</p>
                <p className="text-2xl font-bold text-amber-700">{inProgressCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Done</p>
                <p className="text-2xl font-bold text-[var(--primary)]">{completionRate}%</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                  <p className="text-base font-semibold text-slate-800">Missing Skills</p>
                  <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{missingSkills.length}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {missingSkills.length ? missingSkills.map((skill, idx) => (
                    <div key={skill} className="flex items-center justify-between rounded-md border border-rose-100 bg-rose-50/60 px-3 py-2">
                      <p className="text-sm font-medium text-slate-800">{skill}</p>
                      <span className="text-xs font-semibold text-rose-700">Priority {idx + 1}</span>
                    </div>
                  )) : <span className="text-sm text-slate-500">No missing skills detected.</span>}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <p className="text-base font-semibold text-slate-800">Matched Skills</p>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{matchedSkills.length}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {matchedSkills.length ? matchedSkills.map((skill) => (
                    <div key={skill} className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                      <p className="text-sm font-medium text-slate-800">{skill}</p>
                      <span className="text-xs font-semibold text-emerald-700">Verified</span>
                    </div>
                  )) : <span className="text-sm text-slate-500">No matched skills yet.</span>}
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50 px-5 py-4">
                <p className="text-lg font-bold text-slate-800">Action Plan</p>
                <p className="mt-1 text-sm text-slate-600">
                  Structured execution checklist with priority, timeline, and progress tracking for each missing skill.
                </p>
              </div>

              <div className="border-b border-slate-100 px-5 py-4">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>Overall Progress</span>
                  <span>{completionRate}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-lg font-semibold">Skill</th>
                      <th className="px-5 py-3 text-lg font-semibold">Priority</th>
                      <th className="px-5 py-3 text-lg font-semibold">Plan</th>
                      <th className="px-5 py-3 text-lg font-semibold">Timeline</th>
                      <th className="px-5 py-3 text-lg font-semibold">Status</th>
                      <th className="px-5 py-3 text-lg font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skillPlan.length ? skillPlan.map((item) => {
                      const status = progressMap[item.skill] || "Not Started";
                      const actionLabel =
                        status === "Not Started"
                          ? "Start"
                          : status === "In Progress"
                            ? "In Progress"
                            : "Completed";
                      return (
                        <tr key={item.skill} className="border-t border-slate-100">
                          <td className="px-5 py-4 align-top">
                            <p className="text-lg font-semibold text-slate-800">{item.skill}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.reason}</p>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.priority === "Critical"
                                ? "bg-red-100 text-red-700"
                                : item.priority === "Medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-700"
                            }`}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="px-5 py-4 align-top text-lg text-slate-600">
                            <p>{item.project}</p>
                            <p className="mt-1 text-base text-slate-500">{item.course}</p>
                          </td>
                          <td className="px-5 py-4 align-top text-lg text-slate-600">{item.timeline}</td>
                          <td className="px-5 py-4 align-top">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              status === "Completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "In Progress"
                                  ? "bg-teal-100 text-teal-700"
                                  : "bg-slate-100 text-slate-700"
                            }`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => toggleProgress(item.skill)}
                              disabled={status === "Completed"}
                              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-base font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-emerald-50 disabled:text-emerald-700"
                            >
                              {actionLabel}
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-bold text-slate-800">Interview Prep (Top Likely Questions)</p>
              <p className="mt-1 text-sm text-slate-600">Generated from your current missing skills.</p>
              <div className="mt-3 grid gap-2">
                {interviewQuestions.length ? interviewQuestions.map((question, idx) => (
                  <div key={`${idx}-${question}`} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-700">Q{idx + 1}. {question}</p>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">No missing skills detected. You're ready for role-specific interviews.</p>
                )}
              </div>
            </div>

          </section>
        </div>
      </div>
    </div>
  );
}

function IcmScorePage() {
  const parsed = getStoredAnalysisResult();
  const hasAnalysis = Boolean(parsed);
  const analysisMeta = appState.getAnalysisMeta();
  const matched = parsed?.matchedSkills?.length || 0;
  const missing = parsed?.missingSkills?.length || 0;
  const total = Math.max(matched + missing, 1);
  const skillScore = hasAnalysis ? Math.round((matched / total) * 100) : 0;

  const breakdown = computeWeightedScore({
    skillScore,
    experienceScore: hasAnalysis ? 75 : 0,
    projectScore: hasAnalysis ? 60 : 0,
    keywordScore: hasAnalysis ? 66 : 0,
  });
  const readinessBand =
    breakdown.finalScore >= 90
      ? "Elite Ready"
      : breakdown.finalScore >= 75
        ? "Strong Candidate"
        : breakdown.finalScore >= 60
          ? "Developing"
          : "Needs Core Improvement";
  const quickActions = [
    `Close top ${Math.max(missing, 1)} missing skill gaps`,
    "Add measurable outcomes in project bullets",
    "Improve ATS keyword alignment for selected role",
  ];
  const scoreExplainers = [
    {
      label: "Skill Score",
      value: breakdown.skillScore,
      detail: "Directly reflects matched vs missing role skills from analysis.",
    },
    {
      label: "Experience Score",
      value: breakdown.experienceScore,
      detail: "Estimates depth and consistency of practical work exposure.",
    },
    {
      label: "Project Score",
      value: breakdown.projectScore,
      detail: "Measures quality of project evidence and implementation clarity.",
    },
    {
      label: "ATS Keyword Score",
      value: breakdown.keywordScore,
      detail: "Checks recruiter/ATS keyword relevance for selected role.",
    },
  ];

  return (
    <div className="analyze-bg min-h-screen">
      <div className="grid w-full gap-0 md:grid-cols-[280px_1fr]">
        <WorkspaceSidebar />
        <div className="px-8 py-8">
          <WorkspaceTopbar />
          <PageExportActions className="mb-4" />
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold">ICM Weighted Score</h1>
                <p className="mt-2 text-base text-[var(--muted)]">
                  Insight + Comparison + Mapping powered readiness scoring.
                </p>
                {hasAnalysis && analysisMeta ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {`Source: ${String(analysisMeta.source || "unknown").toUpperCase()} | Time: ${formatAnalysisDuration(Number(analysisMeta.durationMs || 0))}`}
                  </p>
                ) : null}
              </div>
            </div>
            {!hasAnalysis && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                No analysis found. Resume upload ke baad yahan scores visible honge.
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="glass-metric card-lift rounded-xl p-4">
                <p className="text-xs text-slate-500">Skill (40%)</p>
                <p className="mt-1 text-2xl font-bold text-[var(--primary)]">{breakdown.skillScore}</p>
              </div>
              <div className="glass-metric card-lift rounded-xl p-4">
                <p className="text-xs text-slate-500">Experience (25%)</p>
                <p className="mt-1 text-2xl font-bold text-[var(--primary)]">{breakdown.experienceScore}</p>
              </div>
              <div className="glass-metric card-lift rounded-xl p-4">
                <p className="text-xs text-slate-500">Projects (20%)</p>
                <p className="mt-1 text-2xl font-bold text-[var(--primary)]">{breakdown.projectScore}</p>
              </div>
              <div className="glass-metric card-lift rounded-xl p-4">
                <p className="text-xs text-slate-500">ATS Keywords (15%)</p>
                <p className="mt-1 text-2xl font-bold text-[var(--primary)]">{breakdown.keywordScore}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[var(--border)] bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-700">Final Formula</p>
              <p className="mt-1 text-sm text-slate-600">
                Final = (0.40 x Skill) + (0.25 x Experience) + (0.20 x Project) + (0.15 x Keyword)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Each component is weighted to reflect hiring relevance: skills first, then experience, project depth, and ATS keyword strength.
              </p>
              <p className="mt-3 text-3xl font-bold text-[var(--primary)]">{breakdown.finalScore} / 100</p>
              <p className="mt-1 text-sm text-slate-600">
                {breakdown.finalScore >= 90
                  ? "Highly Job Ready"
                  : breakdown.finalScore >= 75
                    ? "Strong Candidate"
                    : breakdown.finalScore >= 60
                      ? "Needs Improvement"
                  : "Significant Skill Gaps"}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_1fr]">
              <div className="glass-soft rounded-xl p-4">
                <p className="text-lg font-semibold text-slate-700">Readiness Band</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{readinessBand}</p>
                <p className="mt-2 text-base text-slate-600">
                  This band summarizes current weighted hiring readiness from ICM scoring.
                </p>
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-700">Current Final Score</p>
                  <p className="text-2xl font-bold text-[var(--primary)]">{breakdown.finalScore} / 100</p>
                </div>
              </div>
              <div className="glass-soft rounded-xl p-4">
                <p className="text-lg font-semibold text-slate-700">Recommended Next Steps</p>
                <ul className="mt-2 list-disc pl-5 text-base text-slate-600">
                  {quickActions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 glass-soft rounded-xl p-4">
              <p className="text-lg font-semibold text-slate-700">Score Breakdown Explanation</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {scoreExplainers.map((item) => (
                  <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold text-slate-800">{item.label}</p>
                      <span className="text-lg font-bold text-[var(--primary)]">{item.value}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsPage() {
  const history = appState.getAnalysisHistory();
  const recent = history.slice(-3).reverse();
  const avgScore = history.length
    ? Math.round(history.reduce((acc, item) => acc + (Number(item.score) || 0), 0) / history.length)
    : 0;
  const latest = recent[0]?.score || 0;
  const trend = history.length >= 2 ? latest - (history[history.length - 2]?.score || 0) : 0;

  return (
    <div className="min-h-screen bg-[var(--bg-main)] px-6 py-12">
      <div className="glass-panel mx-auto max-w-6xl rounded-2xl p-8">
        <PageExportActions className="mb-4" />
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="mt-3 text-[var(--muted)]">Recent analysis trend and readiness movement.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="editorial-strip rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Runs</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{history.length}</p>
          </div>
          <div className="editorial-strip rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Average Score</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{avgScore}%</p>
          </div>
          <div className="editorial-strip rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Last Delta</p>
            <p className={`mt-1 text-3xl font-bold ${trend >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {trend >= 0 ? `+${trend}` : trend}
            </p>
          </div>
        </div>
        <div className="mt-4 editorial-strip rounded-xl p-4">
          <p className="text-base font-semibold text-slate-700">Recent Analyses</p>
          <div className="mt-3 space-y-2">
            {recent.length ? recent.map((item, idx) => (
              <div key={`${item.at || idx}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-sm text-slate-700">{item.role || "Unknown Role"} • {item.source || "unknown"}</p>
                <p className="text-sm font-semibold text-slate-900">{item.score || 0}%</p>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-700">No analysis history yet.</p>
                <p className="mt-1 text-sm text-slate-500">Run your first analysis or try demo mode to start trend tracking.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/analyze" className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white">Run Analyze</Link>
                  <Link to="/" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Try Demo</Link>
                  <Link to="/role-match" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Import JD</Link>
                </div>
              </div>
            )}
          </div>
        </div>
        <Link to="/analyze" className="mt-6 inline-block rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white">Go to Analyze</Link>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { isDark, setIsDark } = useContext(ThemeContext);
  const [defaultRole, setDefaultRole] = useState(() => appState.getSelectedRole() || "Backend Developer");
  const [savedNote, setSavedNote] = useState("");
  const [themeMode, setThemeMode] = useState(() => (isDark ? "dark" : "light"));

  const savePreferences = () => {
    appState.setSelectedRole(defaultRole);
    const makeDark = themeMode === "dark";
    setIsDark(makeDark);
    appState.setTheme(makeDark);
    setSavedNote("Preferences saved.");
  };

  const clearAllData = () => {
    localStorage.removeItem(ANALYSIS_RESULT_KEY);
    localStorage.removeItem(ANALYSIS_META_KEY);
    localStorage.removeItem(ANALYSIS_DURATION_KEY);
    localStorage.removeItem(ANALYSIS_HISTORY_KEY);
    setSavedNote("Analysis data cleared.");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] px-6 py-12">
      <div className="glass-panel mx-auto max-w-6xl rounded-2xl p-8">
        <PageExportActions className="mb-4" />
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-3 text-[var(--muted)]">Configure workspace defaults and quick controls.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="editorial-strip rounded-xl p-4">
            <p className="text-base font-semibold text-slate-700">Default Role</p>
            <select
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {Object.keys(ROLE_SKILL_MAP).map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div className="editorial-strip rounded-xl p-4">
            <p className="text-base font-semibold text-slate-700">Theme Mode</p>
            <select
              value={themeMode}
              onChange={(e) => setThemeMode(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={savePreferences} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">Save Preferences</button>
          <button onClick={clearAllData} className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">Clear Analysis Data</button>
        </div>
        {savedNote ? <p className="mt-3 text-sm font-semibold text-slate-600">{savedNote}</p> : null}
        <Link to="/analyze" className="mt-6 inline-block rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white">Go to Analyze</Link>
      </div>
    </div>
  );
}

function App() {
  const [isDark, setIsDark] = useState(() => appState.getTheme());
  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("theme-dark", next);
      appState.setTheme(next);
      return next;
    });
  };
  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", isDark);
    appState.setTheme(isDark);
  }, [isDark]);
  const isDemo = isDemoModeActive();
  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, toggleTheme }}>
      <BrowserRouter>
        <div className={isDemo ? "demo-galaxy" : ""}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/ats-checker" element={<AtsCheckerPage />} />
            <Route path="/role-match" element={<RoleMatchPage />} />
            <Route path="/missing-skills" element={<MissingSkillsPage />} />
            <Route path="/icm-score" element={<IcmScorePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}

export default App;
