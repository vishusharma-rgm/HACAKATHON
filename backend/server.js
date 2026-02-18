require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const resumeRoutes = require("./routes/resumeRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", resumeRoutes);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(400).json({ error: err.message || "Bad request" });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.warn("Starting server without MongoDB connection:", error.message);
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
