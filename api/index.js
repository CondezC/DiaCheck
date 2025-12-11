import path from "path";
import { readFile } from "fs/promises";

export default async function handler(req, res) {
  const file = await readFile(path.join(process.cwd(), "public", "index.html"), "utf8");

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(file);
}
