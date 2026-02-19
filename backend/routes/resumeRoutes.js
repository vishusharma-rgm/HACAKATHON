const express = require("express");

const upload = require("../middleware/uploadMiddleware");
const {
  analyzeResume,
  parseLinkedInProfile,
  generateClaimTest,
  submitClaimTest,
} = require("../controllers/resumeController");

const router = express.Router();

router.post("/analyze-resume", upload.single("resume"), analyzeResume);
router.post("/parse-linkedin-profile", parseLinkedInProfile);
router.post("/generate-claim-test", upload.single("resume"), generateClaimTest);
router.post("/submit-claim-test", submitClaimTest);

module.exports = router;
