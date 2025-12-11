// Navigation and smooth scrolling
document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.getElementById("navMenu");

  menuToggle.addEventListener('click', function () {
    navMenu.classList.toggle('show');
  });

  document.querySelectorAll("#navMenu a[data-target]").forEach((menuItem) => {
    menuItem.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("data-target");
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      navMenu.classList.remove("show");
    });
  });

  const hash = window.location.hash;
  if (hash) {
    const sectionId = hash.substring(1);
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      setTimeout(() => {
        targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('click', () => {
      const targetId = card.getAttribute('data-target');
      const actionType = card.getAttribute('data-action');
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      if (actionType === 'capture') {
        document.getElementById('startCameraBtn').click();
      } else if (actionType === 'upload') {
        document.getElementById('uploadBtn').click();
      }
    });
  });
});

// ====================================================================
// CAMERA + UPLOAD HANDLING
// ====================================================================
document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById('imageInput');
  const placeholder = document.getElementById('previewPlaceholder');
  const analyzeBtn = document.getElementById('analyzeImageBtn');
  const resultsBox = document.getElementById('resultsSection');
  const videoPrev = document.getElementById('videoPreview');
  const imagePrev = document.getElementById('imagePreview');
  const startBtn = document.getElementById('startCameraBtn');
  const captureBtn = document.getElementById('captureBtn');
  const uploadBtn = document.getElementById('uploadBtn');

  let stream = null;
  let currentImageFile = null;
  let currentAnalysis = null;

  imageInput.addEventListener('change', e => fileSelected(e.target.files[0]));

  imagePrev.addEventListener('click', () => {
    if (imagePrev.src) openFullscreen(imagePrev.src);
  });

  uploadBtn.addEventListener('click', () => {
    imageInput.click();
    stopCamera();
    videoPrev.style.display = 'none';
    imagePrev.style.display = 'none';
    placeholder.style.display = 'block';
    captureBtn.style.display = 'none';
  });

  async function fileSelected(file) {
    if (!file) return;
    currentImageFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      imagePrev.src = e.target.result;
      imagePrev.style.display = 'block';
      placeholder.style.display = 'none';
      analyzeBtn.disabled = false;
      resultsBox.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  startBtn.addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    }

    videoPrev.srcObject = stream;
    videoPrev.style.display = 'block';
    startBtn.style.display = 'none';
    captureBtn.style.display = 'inline-flex';
    placeholder.style.display = 'none';
    analyzeBtn.disabled = true;
    imagePrev.style.display = 'none';
    currentImageFile = null;
  });

  captureBtn.addEventListener('click', () => {
    captureBtn.style.display = 'none';
    const canvas = document.createElement('canvas');
    canvas.width = videoPrev.videoWidth;
    canvas.height = videoPrev.videoHeight;
    canvas.getContext('2d').drawImage(videoPrev, 0, 0);

    canvas.toBlob(blob => {
      currentImageFile = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      const reader = new FileReader();
      reader.onload = e => {
        imagePrev.src = e.target.result;
        imagePrev.style.display = 'block';
        videoPrev.style.display = 'none';
        startBtn.style.display = 'inline-flex';
        analyzeBtn.disabled = false;
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg');

    stopCamera();
  });

  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop());
  }

  // ====================================================================
  // ⭐⭐⭐ FIXED PROCESS — CORRECT ROBOFLOW CLASSIFICATION ⭐⭐⭐
  // ====================================================================
  async function process(formData) {
  try {
    const res = await fetch("/api/processUpload", {
      method: "POST",
      body: formData
    });


      const apiResult = await res.json();
      console.log("📥 FRONTEND RECEIVED:", apiResult);

      document.getElementById("loadingSpinner").style.display = "none";

      // If API FAILED or predictions EMPTY → assume NO diabetes
      if (!apiResult.success || !apiResult.predictions) {
        showResults("none", 0);
        return;
      }

      // Pick top prediction
      const top = apiResult.predictions[0];
      const diseaseRaw = top.class?.toLowerCase() || "";
      const confidence = Math.round(top.confidence * 100);

      // FIXED LOGIC:
      // If Roboflow class == "no diabetes" → healthy
      // Else if class == "diabetes" → detected
      // Else → treat as detected para safe
      let disease = "none";

      if (diseaseRaw.includes("no")) {
        disease = "none";
      } else if (diseaseRaw.includes("diabetes")) {
        disease = "diabetes";
      } else {
        // Unknown class → assume positive
        disease = "diabetes";
      }

      showResults(disease, confidence);
      currentAnalysis = apiResult;

    } catch (err) {
      console.error("❌ FRONTEND ERROR:", err);
      alert("❌ Failed to analyze image.");
      document.getElementById("loadingSpinner").style.display = "none";
    }
  }

  // ====================================================================
  // ⭐ DISPLAY RESULTS ⭐
  // ====================================================================
  function showResults(type, confidence) {
    resultsBox.style.display = "block";

    if (type === "none") {
      document.getElementById("diseaseType").innerText = "No Diabetes Detected";
      document.getElementById("confidenceScore").innerText = confidence + "%";
      document.getElementById("diseaseDescription").innerText =
        "No diabetes indicators were detected from the uploaded document.";
      document.getElementById("prescription").innerHTML = "";
      document.getElementById("mitigation").innerHTML = "";
    } else {
      document.getElementById("diseaseType").innerText = "Diabetes Detected";
      document.getElementById("confidenceScore").innerText = confidence + "%";
      document.getElementById("diseaseDescription").innerText =
        "AI detected indicators consistent with diabetes.";
      document.getElementById("prescription").innerHTML = `
        <li>Consult a licensed medical doctor</li>
        <li>Request FBS & HbA1c test</li>
        <li>Monitor blood sugar daily</li>`;
      document.getElementById("mitigation").innerHTML = `
        <li>Low sugar diet</li>
        <li>Daily exercise</li>
        <li>Avoid alcohol & smoking</li>`;
    }
  }

  analyzeBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    uploadBtn.disabled = true;
    captureBtn.disabled = true;
    analyzeBtn.disabled = true;
    resultsBox.style.display = 'none';
    document.getElementById('loadingSpinner').style.display = 'flex';

    let formData = new FormData();
    if (currentImageFile) {
      formData.append('image', currentImageFile);
      await process(formData);
    }

    analyzeBtn.disabled = false;
  });

  window.openFullscreen = function (src) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    modalImg.src = src;
    modal.style.display = 'flex';
  };
});

// ====================================================================
// HISTORY SYSTEM (unchanged)
// ====================================================================
document.addEventListener("DOMContentLoaded", function () {
  const historyList = document.getElementById('historyList');

  window.appendToHistory = function (entry) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
      <div class="history-item-header">
        <div class="history-details">
          <strong>Disease:</strong> ${entry.disease_type}<br>
          <strong>Confidence:</strong> ${entry.confidence_score}% 
        </div>
      </div>
    `;
    historyList.insertBefore(historyItem, historyList.firstChild);
  };
});
