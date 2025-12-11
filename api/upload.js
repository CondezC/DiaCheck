import formidable from "formidable";
import fs from "fs";
import axios from "axios";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    // NEW Formidable v3 syntax (required for Vercel)
    const form = formidable({
      multiples: false,
      keepExtensions: true,
    });

    const { files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = files.image;
    if (!file) {
      return res.status(400).json({ success: false, error: "No image uploaded" });
    }

    // Read buffer (Vercel-compatible)
    const imageBuffer = fs.readFileSync(file.filepath);
    const imageBase64 = imageBuffer.toString("base64");

    // Send to Roboflow
    const roboflowRes = await axios({
      method: "POST",
      url: `${process.env.ROBOFLOW_API_URL}/${process.env.ROBOFLOW_MODEL_ID}`,
      params: { api_key: process.env.ROBOFLOW_API_KEY },
      data: imageBase64,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    return res.status(200).json({
      success: true,
      predictions: roboflowRes.data.predictions,
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Unknown server error",
    });
  }
}
