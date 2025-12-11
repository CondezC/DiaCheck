import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function processUpload({ file, base64 }) {
  try {
    let imageBase64;

    // 🔥 1. If Vercel gives base64 directly
    if (base64) {
      imageBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
    }

    // 🔥 2. If uploaded file
    else if (file) {
      const filePath = file.filepath || file.path;
      if (!filePath) return { success: false, error: "File path missing" };

      imageBase64 = fs.readFileSync(filePath, "base64");

      // delete temp
      try { fs.unlinkSync(filePath); } catch {}
    }

    else {
      return { success: false, error: "No image received" };
    }

    // 🔥 FIXED: CLASSIFICATION ENDPOINT
    const url = `https://infer.roboflow.com/${process.env.ROBOFLOW_MODEL_ID}/${process.env.ROBOFLOW_MODEL_VERSION}?api_key=${process.env.ROBOFLOW_API_KEY}`;

    console.log("📡 Sending to Roboflow:", url);

    // 🔥 FIXED PAYLOAD: FORM ENCODED (NOT JSON)
    const response = await axios({
      method: "POST",
      url,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: `image=${imageBase64}`,
    });

    console.log("✅ Roboflow Response:", response.data);

    const predictions = response.data?.predictions || [];

    // 🔥 No predictions means "healthy"
    if (predictions.length === 0) {
      return {
        success: true,
        disease: "Healthy",
        confidence: 100,
        message: "No diabetes detected",
        predictions: [],
      };
    }

    // 🔥 pick highest confidence class
    const top = predictions.sort((a, b) => b.confidence - a.confidence)[0];

    return {
      success: true,
      disease: top.class,
      confidence: Math.round(top.confidence * 100),
      predictions,
    };

  } catch (error) {
    console.error("❌ ROBOFLOW ERROR:", error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data || error.message || "Roboflow request failed",
    };
  }
}
