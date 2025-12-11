import formidable from "formidable";
import fs from "fs";
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
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const form = formidable({ multiples: false });

    const [fields, files] = await form.parse(req);

    if (!files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = files.file[0];

    const buffer = fs.readFileSync(file.filepath);

    const base64Image = buffer.toString("base64");

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
    res.status(500).json({
      error: "Upload processing failed",
      details: error.message,
    });
  }
}
