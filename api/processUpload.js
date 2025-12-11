import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function processUpload({ file, base64 }) {
  try {
    let imageBase64;

    // 🔥 If Vercel sent a base64 directly
    if (base64) {
      imageBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
    }
    // 🔥 If user uploaded a file
    else if (file) {
      const filePath = file.filepath || file.path;

      if (!filePath) {
        return { success: false, error: "File path missing (from Vercel)" };
      }

      imageBase64 = fs.readFileSync(filePath, { encoding: "base64" });

      // Delete temp file
      try { fs.unlinkSync(filePath); } catch {}
    }
    else {
      return { success: false, error: "No image found" };
    }

    // 🔥 FIXED — Use Roboflow CLASSIFICATION API
    const url = `${process.env.ROBOFLOW_API_URL}/${process.env.ROBOFLOW_MODEL_ID}?api_key=${process.env.ROBOFLOW_API_KEY}`;

    // 🔥 FIXED — classification expects JSON, not form-urlencoded
    const response = await axios.post(url, {
      image: imageBase64,
    });

    const predictions = response.data?.predictions || [];

    if (predictions.length === 0) {
      return {
        success: true,
        disease: "Healthy",
        confidence: 100,
        message: "No diabetes detected",
        predictions: [],
      };
    }

    // Pick highest confidence
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
