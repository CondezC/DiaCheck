import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function processUpload({ file, base64 }) {
  try {
    let imageBase64;

    // If the image was sent already in base64 (Vercel)
    if (base64) {
      imageBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
    }

    // If the user uploaded a file
    else if (file) {
      const filePath = file.filepath || file.path;

      if (!filePath) {
        return { success: false, error: "File path missing (Vercel)" };
      }

      imageBase64 = fs.readFileSync(filePath, { encoding: "base64" });

      // Clean up uploaded temp file
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }

    else {
      return { success: false, error: "No image received" };
    }

    // Roboflow CLASSIFICATION API endpoint
    const url = `${process.env.ROBOFLOW_API_URL}/${process.env.ROBOFLOW_MODEL_ID}?api_key=${process.env.ROBOFLOW_API_KEY}`;

    console.log("📡 Sending request to Roboflow:", url);

    // Send JSON payload
    const response = await axios.post(url, {
      image: imageBase64,
    });

    console.log("✅ Roboflow Response:", response.data);

    const predictions = response.data?.predictions || [];

    // No predictions = Healthy
    if (predictions.length === 0) {
      return {
        success: true,
        disease: "Healthy",
        confidence: 100,
        message: "No diabetes detected",
        predictions: [],
      };
    }

    // Get highest confidence prediction
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
      error: error.response?.data || error.message || "Roboflow request failed",
    };
  }
}
