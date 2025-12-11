import express from "express";
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import multer from "multer";
import cors from "cors";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { processUpload } from "./lib/processUpload.js";
import { getHistory } from "./lib/getHistory.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const SSL_KEY = path.join(__dirname, "server.key");
const SSL_CERT = path.join(__dirname, "server.cert");
const ENV = process.env.NODE_ENV || "development";

/* ======================
   HTTPS / HTTP SERVER
====================== */
let server;
if (
  ENV === "development" &&
  fs.existsSync(SSL_KEY) &&
  fs.existsSync(SSL_CERT)
) {
  server = https.createServer(
    {
      key: fs.readFileSync(SSL_KEY),
      cert: fs.readFileSync(SSL_CERT),
    },
    app
  );
  console.log("✅ HTTPS enabled for development");
} else {
  server = http.createServer(app);
  console.log("✅ HTTP enabled");
}

/* ======================
   MIDDLEWARES
====================== */
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ======================
   FILE UPLOAD CONFIG
====================== */
const upload = multer({ dest: "uploads/" });
app.use("/uploads", express.static("uploads"));

/* ======================
   ROUTES
====================== */
app.get("/", (_, res) => {
  res.redirect("/home");
});

app.get("/home", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/analytics", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "analytics.html"));
});

app.get("/information", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "information.html"));
});

/* ======================
   ✅ SINGLE UPLOAD API
====================== */
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No image uploaded"
      });
    }

    const result = await processUpload({ file: req.file });

    if (!result.success) {
      return res.status(500).json({
        error: "Roboflow analysis failed"
      });
    }

    // ✅ EXACT FORMAT NA KAILANGAN NG FRONTEND
    return res.status(200).json({
      roboflow: {
        predictions: result.predictions
      }
    });

  } catch (error) {
    console.error("❌ UPLOAD ERROR:", error);
    return res.status(500).json({
      error: "Server error"
    });
  }
});


/* ======================
   CLEAN UPLOADS ON START
====================== */
const uploadsPath = path.join(__dirname, "uploads");

if (fs.existsSync(uploadsPath)) {
  fs.readdirSync(uploadsPath).forEach((file) => {
    try {
      fs.unlinkSync(path.join(uploadsPath, file));
      console.log("🗑 Deleted:", file);
    } catch {}
  });
} else {
  fs.mkdirSync(uploadsPath);
}

/* ======================
   START SERVER
====================== */
server.listen(PORT, () => {
  console.log(
    `🚀 Server running at http${
      server instanceof https.Server ? "s" : ""
    }://localhost:${PORT}`
  );
});
