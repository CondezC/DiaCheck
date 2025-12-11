async function analyzeImage(base64Image) {
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64: base64Image }),
    });

    const result = await response.json();

    console.log("📌 FULL RAW RESPONSE:", result.debug_raw_response);
    alert("RAW RESPONSE:\n\n" + JSON.stringify(result.debug_raw_response, null, 2));

    // TEMPORARY: show predictions
    if (result?.predictions) {
      console.log("📌 Predictions:", result.predictions);
    }

  } catch (err) {
    console.error("❌ ERROR:", err);
    alert("Error analyzing image");
  }
}
