const express = require("express");

const upload = require("../middleware/uploadMiddleware");
const { analyzeResume, parseLinkedInProfile } = require("../controllers/resumeController");

const router = express.Router();

router.post("/analyze-resume", upload.single("resume"), analyzeResume);
router.post("/parse-linkedin-profile", parseLinkedInProfile);

module.exports = router;
