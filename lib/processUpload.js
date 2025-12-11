import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function processUpload({ file, base64 }) {
  try {
    let imageBase64;

    // 🔥 If Vercel sent base64 directly (common on serverless)
    if (base64) {
      imageBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
    } 
    else if (file) {
      const filePath = file.filepath || file.path;

      if (!filePath) {
        return { success: false, error: "File path missing (Vercel)" };
      }

      imageBase64 = fs.readFileSync(filePath, { encoding: "base64" });

      // Delete local temp file (Vercel storage is limited)
      try { fs.unlinkSync(filePath); } catch {}
    } 
    else {
      return { success: false, error: "No image found" };
    }

    const url = `https://detect.roboflow.com/${process.env.ROBOFLOW_MODEL_ID}?api_key=${process.env.ROBOFLOW_API_KEY}`;

    // 🔥 REQUIRED FORMAT for Roboflow
    const body = `image=${imageBase64}`;

    const response = await axios.post(url, body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const predictions = response.data?.predictions || [];

    if (predictions.length === 0) {
      return {
        success: true,
        disease: "Healthy",
        confidence: 100,
        message: "No diabetes detected",
        predictions: []
      };
    }

    const topPrediction = predictions.sort((a, b) => b.confidence - a.confidence)[0];

    return {
      success: true,
      disease: topPrediction.class,
      confidence: Math.round(topPrediction.confidence * 100),
      predictions,
    };

  } catch (error) {
    console.error("❌ ROBOFLOW ERROR:", error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data || "Roboflow request failed",
    };
  }
}
