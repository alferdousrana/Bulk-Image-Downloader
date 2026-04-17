const imageLinksInput = document.getElementById("imageLinks");
const previewBtn = document.getElementById("previewBtn");
const downloadZipBtn = document.getElementById("downloadZipBtn");
const clearBtn = document.getElementById("clearBtn");
const pasteBtn = document.getElementById("pasteBtn"); // NEW
const previewGrid = document.getElementById("previewGrid");
const statusEl = document.getElementById("status");
const bookmarkletBtn = document.getElementById("bookmarkletBtn");
const showGifBtn = document.getElementById("showGifBtn");
const gifModal = document.getElementById("gifModal");
const closeGifBtn = document.getElementById("closeGifBtn");

let previewData = [];

const BOOKMARKLET_CODE =
  'javascript:(function(){var imgs=document.querySelectorAll(\'img[src*="behance.net"],img[src*="mir-s3-cdn-cf"],img[src*="cdn.bhdw.net"],img[src*="mir-cdn.behance.net"]\');var urls=new Set();imgs.forEach(function(img){var src=img.src||\'\';var ds=img.dataset.src||img.getAttribute(\'data-src\')||\'\';[src,ds].forEach(function(u){if(u&&(u.includes(\'.jpg\')||u.includes(\'.png\')||u.includes(\'.webp\'))&&!u.includes(\'50x50\')&&!u.includes(\'115x\')&&!u.includes(\'avatar\')&&!u.includes(\'profile_cover\')&&!u.includes(\'user_avatar\')&&u.length>30){var clean=u.split(\'?\')[0];if(clean.includes(\'project_modules\')||clean.includes(\'gallery_module\')){urls.add(clean);}}});});var links=document.querySelectorAll(\'a[href*=".jpg"],a[href*=".png"],a[href*=".webp"]\');links.forEach(function(a){if(a.href.includes(\'behance\')||a.href.includes(\'mir-s3\')){urls.add(a.href.split(\'?\')[0]);}});if(urls.size===0){alert(\'No images were found. Please make sure the page is fully loaded.\');return;}var list=Array.from(urls).join(\'\\n\');if(navigator.clipboard){navigator.clipboard.writeText(list).then(function(){alert(urls.size+\' image URL(s) copied to clipboard. Paste them into the downloader tool.\');}).catch(function(){var ta=document.createElement(\'textarea\');ta.value=list;document.body.appendChild(ta);ta.select();document.execCommand(\'copy\');document.body.removeChild(ta);alert(urls.size+\' image URL(s) copied to clipboard.\');});}else{var ta=document.createElement(\'textarea\');ta.value=list;document.body.appendChild(ta);ta.select();document.execCommand(\'copy\');document.body.removeChild(ta);alert(urls.size+\' image URL(s) copied to clipboard.\');}})();';

bookmarkletBtn.href = BOOKMARKLET_CODE;
bookmarkletBtn.title = "Drag this button to your bookmarks bar";

function parseLinks() {
  return imageLinksInput.value
    .split("\n")
    .map((link) => link.trim())
    .filter((link) => link.length > 0);
}

function updateStatus(message) {
  statusEl.textContent = message;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderPreviews(items) {
  if (!items.length) {
    previewGrid.innerHTML = '<div class="empty-card">Image previews will appear here.</div>';
    return;
  }

  previewGrid.innerHTML = items
    .map(
      (item, index) => `
        <div class="preview-card">
          <img
            class="thumb"
            src="${item.url}"
            alt="Preview ${index + 1}"
            referrerpolicy="no-referrer"
            loading="lazy"
          />
          <div class="meta">
            <div class="title">${escapeHtml(item.url)}</div>
            <span class="label ${item.valid ? "ok" : "fail"}">
              ${item.valid ? "Loaded" : "Failed"}
            </span>
          </div>
        </div>
      `
    )
    .join("");
}

function validateImages(urls) {
  if (!urls.length) {
    previewData = [];
    renderPreviews([]);
    updateStatus("Please enter at least one image link.");
    return;
  }

  updateStatus("Checking image links...");

  const checks = urls.map((url) => {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => resolve({ url, valid: true });
      img.onerror = () => resolve({ url, valid: false });

      img.referrerPolicy = "no-referrer";
      img.src = url;
    });
  });

  Promise.all(checks).then((results) => {
    previewData = results;
    renderPreviews(results);
    const validCount = results.filter((item) => item.valid).length;
    updateStatus(`${validCount} of ${results.length} image(s) loaded successfully.`);
  });
}

async function downloadZip() {
  const urls = parseLinks();

  if (!urls.length) {
    updateStatus("Please enter at least one image link.");
    return;
  }

  try {
    updateStatus("Creating ZIP file...");

    const response = await fetch("/api/download-zip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ urls })
    });

    if (!response.ok) {
      throw new Error("Failed to generate ZIP.");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "images.zip";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(downloadUrl);

    updateStatus("ZIP downloaded successfully.");
  } catch (error) {
    console.error(error);
    updateStatus("ZIP download failed. Some sites may block remote fetching.");
  }
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();

    if (!text.trim()) {
      updateStatus("Clipboard is empty.");
      return;
    }

    imageLinksInput.value = text;
    updateStatus("Clipboard content pasted successfully.");
  } catch (error) {
    console.error(error);
    updateStatus("Clipboard paste failed. Please allow clipboard permission.");
  }
}

function clearAll() {
  imageLinksInput.value = "";
  previewData = [];
  renderPreviews([]);
  updateStatus("Cleared.");
}

previewBtn.addEventListener("click", () => {
  const urls = parseLinks();
  validateImages(urls);
});

downloadZipBtn.addEventListener("click", downloadZip);
clearBtn.addEventListener("click", clearAll);
pasteBtn.addEventListener("click", pasteFromClipboard); // NEW
showGifBtn.addEventListener("click", () => {
  gifModal.classList.add("show");
});

closeGifBtn.addEventListener("click", () => {
  gifModal.classList.remove("show");
});

gifModal.addEventListener("click", (e) => {
  if (e.target === gifModal) {
    gifModal.classList.remove("show");
  }
});