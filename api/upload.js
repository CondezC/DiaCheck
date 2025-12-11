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
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  try {
    console.log("📩 File upload received...");

    // Parse multipart form (image)
    const form = new formidable.IncomingForm();
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = files.image;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const fileData = fs.readFileSync(file.filepath);
    const base64 = fileData.toString("base64");

    console.log("📡 Sending request to Roboflow...");

    const modelId = process.env.ROBOFLOW_MODEL_ID;
    const apiKey = process.env.ROBOFLOW_API_KEY;

    const roboflowURL = `https://classify.roboflow.com/${modelId}?api_key=${apiKey}`;

    const rfRes = await axios({
      method: "POST",
      url: roboflowURL,
      data: base64,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log("✅ Roboflow Response:", rfRes.data);

    return res.status(200).json({
      success: true,
      predictions: rfRes.data.predictions || [],
    });

  } catch (error) {
    console.error("❌ SERVER ERROR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
