import formidable from "formidable";
import sharp from "sharp";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const config = {
  api: {
    bodyParser: false, 
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    if (!files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = files.file[0]; // FORMIABLE v3 format

    // Convert file → buffer
    const buffer = await sharp(file.filepath)
      .resize({ width: 640 })
      .jpeg()
      .toBuffer();

    const base64Image = buffer.toString("base64");

    // Request to Roboflow
    const url = `${process.env.ROBOFLOW_API_URL}/${process.env.ROBOFLOW_MODEL_ID}?api_key=${process.env.ROBOFLOW_API_KEY}&format=json`;

    const response = await axios.post(url, base64Image, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return res.status(200).json({
      success: true,
      roboflow: response.data,
    });
  } catch (error) {
    console.error("UPLOAD API ERROR:", error);
    return res.status(500).json({
      error: "Upload processing failed",
      details: error.message,
    });
  }
}
