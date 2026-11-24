const fs = require("fs");
const path = require("path");
module.exports = (req, res) => {
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  const encoded = fs.readFileSync(path.join(process.cwd(), "assets", "rishika-avatar.b64"), "utf8").trim();
  res.status(200).send(Buffer.from(encoded, "base64"));
};