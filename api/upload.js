import formidable from "formidable";
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
    const form = formidable({ multiples: false });

    // Parse form
    const data = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = data.files.image;
    if (!file) {
      return res.status(400).json({ success: false, error: "No image uploaded" });
    }

    // 🔥 IMPORTANT: Use toBuffer() (Vercel compatible)
    const buffer = await file.toBuffer();
    const imageBase64 = buffer.toString("base64");

    // 🔥 Send to Roboflow
    const roboflowURL = `${process.env.ROBOFLOW_API_URL}/${process.env.ROBOFLOW_MODEL_ID}`;
    const roboflowRes = await axios({
      method: "POST",
      url: roboflowURL,
      params: {
        api_key: process.env.ROBOFLOW_API_KEY,
      },
      data: imageBase64,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    console.log("ROBLOFLOW RESPONSE:", roboflowRes.data);

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
