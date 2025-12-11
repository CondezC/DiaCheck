import { IncomingForm } from "formidable";
import { processUpload } from "./processUpload.js";  // ← FIXED

export const config = {
  api: { bodyParser: false },
};

export default function handler(req, res) {
  const form = new IncomingForm({
    multiples: false,
    keepExtensions: true,
    uploadDir: "/tmp",
    filename: (name, ext, part) => `${Date.now()}-${part.originalFilename}`,
    maxFileSize: 10 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        console.error("❌ Formidable parse error:", err.message);
        return res.status(400).json({ error: "Form parsing failed" });
      }

      // 🔥 Handle Vercel's random file key names
      const uploaded =
        files.image ||
        files.file ||
        files.upload ||
        (Array.isArray(files.image) ? files.image[0] : null) ||
        (Array.isArray(files.file) ? files.file[0] : null) ||
        (Array.isArray(files.upload) ? files.upload[0] : null);

      const base64 = fields?.image || null;

      if (!uploaded && !base64) {
        return res.status(400).json({ error: "Missing image file or base64 string" });
      }

      const result = await processUpload({ file: uploaded, base64 });
      res.status(200).json(result);

    } catch (err) {
      console.error("❌ Upload handler error:", err.message);
      res.status(500).json({ error: "Upload failed", detail: err.message });
    }
  });
}
