import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function processUpload({ base64 }) {
  try {
    if (!base64) {
      return { success: false, error: "No image received (base64 missing)" };
    }

    // Remove prefix if exists
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");

    // Roboflow endpoint
    const url = `${process.env.ROBOFLOW_API_URL}/${process.env.ROBOFLOW_MODEL_ID}?api_key=${process.env.ROBOFLOW_API_KEY}`;

    console.log("📡 Sending to Roboflow:", url);

    // Send to Roboflow CLASSIFICATION API
    const response = await axios.post(url, {
      image: cleanBase64,
    });

    console.log("✅ Roboflow Response:", response.data);

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

    const topPrediction = predictions.sort((a, b) => b.confidence - a.confidence)[0];

    return {
      success: true,
      disease: topPrediction.class,
      confidence: Math.round(topPrediction.confidence * 100),
      predictions,
    };

  } catch (error) {
    console.error("❌ Roboflow Error:", error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data || error.message || "Roboflow request failed",
    };
  }
}
