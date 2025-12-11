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
    const form = formidable({
      multiples: false,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    // Sa Formidable v3, file field looks like:
    // files.file = [ { filepath, mimetype, originalFilename } ]
    const uploaded = files.file?.[0];

    if (!uploaded) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = uploaded.filepath;

    // Read file as base64
    const buffer = fs.readFileSync(filePath);
    const base64Image = buffer.toString("base64");

    // Roboflow URL
    const url = `${process.env.ROBOFLOW_API_URL}/${process.env.ROBOFLOW_MODEL_ID}?api_key=${process.env.ROBOFLOW_API_KEY}&format=json`;

    const response = await axios.post(
      url,
      { image: base64Image },
      { headers: { "Content-Type": "application/json" } }
    );

    // Delete temp uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch {}

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
