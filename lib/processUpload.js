import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function processUpload({ file }) {
  try {
    // ✅ Check if file exists
    if (!file) {
      return { success: false, error: "No image uploaded" };
    }

    // ✅ Convert image to Base64
    const imageBase64 = fs.readFileSync(file.path, {
      encoding: "base64",
    });

    // ✅ Build Roboflow URL (DETECT API)
    const url = `https://detect.roboflow.com/${process.env.ROBOFLOW_MODEL_ID}?api_key=${process.env.ROBOFLOW_API_KEY}`;

    // ✅ Send image to Roboflow
    const response = await axios.post(url, imageBase64, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // ✅ Log full response to terminal (for debugging)
    console.log("✅ ROBOFLOW FULL RESPONSE:", response.data);

    // ✅ Extract predictions
    const predictions = response.data?.predictions || [];

    // ✅ If no disease detected
    if (predictions.length === 0) {
      fs.unlinkSync(file.path);

      return {
        success: true,
        disease: "Healthy",
        confidence: 100,
        message: "No diabetes detected",
        predictions: [],
      };
    }

    // ✅ Get highest confidence result
    const topPrediction = predictions.sort(
      (a, b) => b.confidence - a.confidence
    )[0];

    // ✅ Delete uploaded image
    fs.unlinkSync(file.path);

    return {
      success: true,
      disease: topPrediction.class,
      confidence: Math.round(topPrediction.confidence * 100),
      predictions,
      raw: response.data,
    };
  } catch (error) {
    console.error("❌ ROBOFLOW ERROR:", error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data || "Roboflow request failed",
    };
  }
}
