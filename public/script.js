// Navigation and smooth scrolling
document.addEventListener("DOMContentLoaded", function () {
  // Mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.getElementById("navMenu");

  menuToggle.addEventListener('click', function () {
    navMenu.classList.toggle('show');
  });

  // Smooth scroll for internal nav on same page
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

  // If URL contains hash (e.g. /home/#history), scroll to it smoothly
  const hash = window.location.hash;
  if (hash) {
    const sectionId = hash.substring(1); // remove the '#' character
    const targetSection = document.getElementById(sectionId);

    if (targetSection) {
      // Use setTimeout to delay scroll until after initial render
      setTimeout(() => {
        targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  // Feature cards click handling
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('click', () => {
      const targetId = card.getAttribute('data-target');
      const actionType = card.getAttribute('data-action');
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Trigger specific actions based on data-action
      if (actionType === 'capture') {
        document.getElementById('startCameraBtn').click();
      } else if (actionType === 'upload') {
        document.getElementById('uploadBtn').click();
      }
    });
  });
});

// Image upload and camera functionality
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
    if (imagePrev.src) {
      openFullscreen(imagePrev.src);
    }
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

  analyzeBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    uploadBtn.disabled = true;
    captureBtn.disabled = true;
    analyzeBtn.disabled = true;
    resultsBox.style.display = 'none';
    document.getElementById('loadingSpinner').style.display = 'flex'; // show spinner
    let formData = new FormData();
    if (currentImageFile) {
      formData.append('image', currentImageFile);
      if (currentAnalysis && currentAnalysis?.disease_type?.toLowerCase() !== 'healthy' && currentAnalysis?.annotated_image_url && currentAnalysis?.annotated_image_url !== imagePrev.src) {
        window.appendToHistory(currentAnalysis);
      }
      await process(formData);
    }
  });

async function processHistory(formData) {
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const apiResult = await res.json();
    console.log("✅ FRONTEND RECEIVED:", apiResult);

    document.getElementById("loadingSpinner").style.display = "none";

    if (
      !apiResult.roboflow ||
      !apiResult.roboflow.predictions ||
      apiResult.roboflow.predictions.length === 0
    ) {
      throw new Error("No prediction returned");
    }

    // ✅ KUNIN UNANG RESULT
    const prediction = apiResult.roboflow.predictions[0];
    const detectedClass = prediction.class.toLowerCase();
    const confidence = Math.round(prediction.confidence * 100);

    // =====================
    // ✅ DISPLAY RESULT
    // =====================

    if (detectedClass === "diabetes") {
      document.getElementById("diseaseType").innerText = "Diabetes Detected";
      document.getElementById("confidenceScore").innerText = confidence + "%";

      document.getElementById("diseaseDescription").innerText =
        "AI detected diabetes indicators from your uploaded medical document.";

      document.getElementById("prescription").innerHTML = `
        <li>Immediately consult a licensed medical doctor</li>
        <li>Request laboratory test (FBS & HbA1c)</li>
        <li>Monitor blood sugar daily</li>
      `;

      document.getElementById("mitigation").innerHTML = `
        <li>Low sugar & low carbohydrate diet</li>
        <li>Daily physical activity</li>
        <li>Avoid alcohol & smoking</li>
      `;
    } else {
      document.getElementById("diseaseType").innerText = "No Diabetes Detected";
      document.getElementById("confidenceScore").innerText = confidence + "%";

      document.getElementById("diseaseDescription").innerText =
        "No diabetes indicators were detected from the uploaded document.";

      document.getElementById("prescription").innerHTML = "";
      document.getElementById("mitigation").innerHTML = "";
    }

    resultsBox.style.display = "block";
    analyzeBtn.disabled = false;

  } catch (err) {
    console.error("❌ FRONTEND ERROR:", err);
    alert("❌ Failed to analyze image.");
    document.getElementById("loadingSpinner").style.display = "none";
    analyzeBtn.disabled = false;
  }
}



  // Global function for fullscreen view
  window.openFullscreen = function (src) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    modalImg.src = src;
    modal.style.display = 'flex';
  };
});

// History functionality
document.addEventListener("DOMContentLoaded", function () {
  const historyList = document.getElementById('historyList');
  const noHistoryMessage = document.getElementById('noHistoryMessage');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const PAGE_SIZE = 10;

  let currentPage = 1;
  let totalItems = 0;
  let loadedItems = 0;
  let loadedList = [];

  async function process(formData) {
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const apiResult = await res.json();
    console.log("✅ FRONTEND RECEIVED:", apiResult);

    document.getElementById("loadingSpinner").style.display = "none";

    // ✅ WALANG DETECTION
    if (!apiResult.success || !apiResult.roboflow || apiResult.roboflow.predictions.length === 0) {
      document.getElementById("diseaseType").innerText = "No Diabetes Detected";
      document.getElementById("confidenceScore").innerText = "0%";
      document.getElementById("diseaseDescription").innerText =
        "No diabetes indicators were detected from the uploaded document.";
      document.getElementById("prescription").innerHTML = "";
      document.getElementById("mitigation").innerHTML = "";
      resultsBox.style.display = "block";
      return;
    }

    // ✅ MAY DETECTION
    const prediction = apiResult.roboflow.predictions[0];

    const disease = prediction.class;
    const confidence = Math.round(prediction.confidence * 100);

    document.getElementById("diseaseType").innerText = disease;
    document.getElementById("confidenceScore").innerText = confidence + "%";

    document.getElementById("diseaseDescription").innerText =
      "AI detected possible diabetes indicators from your uploaded medical document.";

    document.getElementById("prescription").innerHTML = `
      <li>Consult a medical doctor immediately</li>
      <li>Request laboratory test: FBS & HbA1c</li>
      <li>Monitor blood sugar daily</li>
    `;

    document.getElementById("mitigation").innerHTML = `
      <li>Low sugar & low carbohydrate diet</li>
      <li>Daily physical activity</li>
      <li>Avoid alcohol & smoking</li>
    `;

    resultsBox.style.display = "block";
    analyzeBtn.disabled = false;

  } catch (err) {
    console.error("❌ FRONTEND ERROR:", err);
    alert("❌ Failed to analyze image.");
    document.getElementById("loadingSpinner").style.display = "none";
    analyzeBtn.disabled = false;
  }
}


  // Initial load
  loadNextPage();

  // Load more click
  loadMoreBtn.addEventListener('click', () => {
    loadNextPage();
  });

  // Modal click to close
  const modal = document.getElementById('imageModal');
  modal.addEventListener('click', () => {
    modal.style.display = 'none';
    document.getElementById('modalImg').src = '';
  });

  // Dynamic injection for new analysis
  window.appendToHistory = function (entry) {
    // Create the item DOM and inject to top
    if (loadedList.some(item => item.id === entry.id)) {
      return;
    };
    loadedList.pop();
    loadedList.unshift(entry);
    console.log("Appending to history:", loadedList);
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
    <div class="history-item-header">
      <div class="history-details">
        <strong>Date:</strong>
        ${new Date(entry.created_at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric',
      minute: '2-digit', hour12: true
    })}<br>
        <strong>Disease:</strong> ${entry.disease_type}<br>
        <strong>Confidence:</strong> ${Math.round(entry.confidence_score)}%
      </div>
      <button class="btn view-details-btn">View Details</button>
    </div>
    <div class="history-expanded-details">
      <img src="${entry.annotated_image_url}" onclick="openFullscreen('${entry.annotated_image_url}')" style="cursor: pointer; max-height:200px; border:1px solid #888; border-radius: 8px;">
      <div class="history-item-content">
        <p><strong>Description:</strong> ${entry.description}</p>
        <p><strong>Prescription:</strong> ${entry.prescription}</p>
        <p><strong>Mitigation:</strong> ${entry.mitigation_strategies}</p>
      </div>
    </div>
  `;

    const detailsBtn = historyItem.querySelector('.view-details-btn');
    const expandedDetails = historyItem.querySelector('.history-expanded-details');
    detailsBtn.addEventListener('click', () => {
      expandedDetails.classList.toggle("open");
      detailsBtn.innerText = expandedDetails.classList.contains("open") ? "Hide Details" : "View Details";
    });

    historyList.insertBefore(historyItem, historyList.firstChild);
    historyList.removeChild(historyList.lastChild);
    totalItems++;
    loadMoreBtn.style.display = loadedItems < totalItems ? 'block' : 'none';
  };
});