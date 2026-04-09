const express = require("express");
const cors = require("cors");
const axios = require("axios");
const archiver = require("archiver");
const path = require("path");
const { URL } = require("url");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

function getFileNameFromUrl(url, index, contentType = "") {
  try {
    const parsed = new URL(url);
    let name = parsed.pathname.split("/").pop() || "";

    if (!name || !name.includes(".")) {
      const ext = getExtensionFromContentType(contentType) || "jpg";
      name = `image-${index + 1}.${ext}`;
    }

    return sanitizeFileName(name);
  } catch {
    const ext = getExtensionFromContentType(contentType) || "jpg";
    return `image-${index + 1}.${ext}`;
  }
}

function getExtensionFromContentType(contentType) {
  if (!contentType) return "";
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("jpg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("bmp")) return "bmp";
  if (contentType.includes("svg")) return "svg";
  return "";
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

app.post("/download-zip", async (req, res) => {
  const { urls } = req.body || {};

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "No image URLs provided." });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="images.zip"');

  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("error", (err) => {
    console.error("Archive error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to create zip." });
    } else {
      res.end();
    }
  });

  archive.pipe(res);

  let addedCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = String(urls[i] || "").trim();
    if (!url) continue;

    try {
      const response = await axios.get(url, {
        responseType: "stream",
        timeout: 20000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "image/*,*/*;q=0.8",
          Referer: url,
        },
        maxRedirects: 5,
      });

      const contentType = response.headers["content-type"] || "";
      const fileName = getFileNameFromUrl(url, i, contentType);

      archive.append(response.data, { name: fileName });
      addedCount++;
    } catch (error) {
      console.error(`Failed to fetch image: ${url}`);
    }
  }

  if (addedCount === 0) {
    archive.append("No valid images could be fetched.", { name: "README.txt" });
  }

  archive.finalize();
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});