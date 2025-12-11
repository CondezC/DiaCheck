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
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const form = formidable({ multiples: false });

    const [fields, files] = await form.parse(req);

    if (!files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // correct: because multiples=false → NOT AN ARRAY
    const file = files.file;

    const buffer = fs.readFileSync(file.filepath);
    const base64Image = buffer.toString("base64");

    const url = `${process.env.ROBOFLOW_API_URL}/${process.env.ROBOFLOW_MODEL_ID}?api_key=${process.env.ROBOFLOW_API_KEY}&format=json`;

    const response = await axios.post(
      url,
      { image: base64Image },    // 👈 MUST BE JSON
      {
        headers: { "Content-Type": "application/json" },
        timeout: 8000,            // 👈 PREVENT 404 HANG
      }
    );

    return res.status(200).json({
      success: true,
      roboflow: response.data,
    });
  } catch (error) {
    console.error("UPLOAD API ERROR:", error?.response?.data || error.message);
    return res.status(500).json({
      error: "Upload processing failed",
      details: error?.response?.data || error.message,
    });
  }
}
