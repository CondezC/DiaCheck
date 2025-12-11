import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function processUpload({ file }) {
  try {
    if (!file) {
      return { success: false, error: "No image uploaded" };
    }

    // 🔥 FIX: Vercel uses file.filepath, not file.path
    const filePath = file.filepath || file.path;

    if (!filePath) {
      return { success: false, error: "File path missing (Vercel)" };
    }

    // Convert image to Base64
    const imageBase64 = fs.readFileSync(filePath, { encoding: "base64" });

    // Roboflow URL
    const url = `https://detect.roboflow.com/${process.env.ROBOFLOW_MODEL_ID}?api_key=${process.env.ROBOFLOW_API_KEY}`;

    // Send to Roboflow
    const response = await axios.post(url, imageBase64, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const predictions = response.data?.predictions || [];

    // Delete image after processing (optional)
    fs.unlinkSync(filePath);

    if (predictions.length === 0) {
      return {
        success: true,
        disease: "Healthy",
        confidence: 100,
        message: "No diabetes detected",
        predictions: [],
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
