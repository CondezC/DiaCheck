import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function processUpload({ file, base64 }) {
  try {
    let imageBase64;

    // If base64 came from Vercel form upload
    if (base64) {
      imageBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
    }

    // If file uploaded locally
    else if (file) {
      const filePath = file.filepath || file.path;

      if (!filePath) {
        return { success: false, error: "File path missing (Vercel)" };
      }

      imageBase64 = fs.readFileSync(filePath, { encoding: "base64" });

      // delete temp upload file
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }

    else {
      return { success: false, error: "No image received" };
    }

    // Roboflow endpoint
    const url = `${process.env.ROBOFLOW_API_URL}/${process.env.ROBOFLOW_MODEL_ID}?api_key=${process.env.ROBOFLOW_API_KEY}`;

    console.log("📡 Sending request to Roboflow:", url);

    // Send JSON payload
    const response = await axios.post(url, {
      image: imageBase64,
    });

    console.log("✅ Roboflow Response:", response.data);

    const predictions = response.data?.predictions || [];

    // DEBUG MODE — return FULL RAW RESPONSE to frontend
    return {
      success: true,
      debug_raw_response: response.data, // 👈 IMPORTANT
      predictions
    };

  } catch (error) {
    console.error("❌ ROBOFLOW ERROR:", error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data || error.message || "Roboflow request failed",
    };
  }
}
