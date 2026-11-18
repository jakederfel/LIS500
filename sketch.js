// LIS 500: Teachable Machine — Adi Govil and Jake Derfel (AG / JD)
// Adapted from Daniel Shiffman / The Coding Train:
// https://editor.p5js.org/codingtrain/sketches/PoZXqbu4v
// Uses the same setup, draw, classifyVideo, and gotResults structure.
// Our additions are camera controls, a model score, and status messages.
// We load on Start instead of preload so a missing model does not block the page.

let video;
let label = "Not running";
let classifier;
let confidence = 0;
let running = false;
let session = 0;

// STEP 1: Load our exported model. Keep the slash at the end.
// The exported labels are Mugs, Empty, and Bottles.
let modelURL = "https://teachablemachine.withgoogle.com/models/scoxiocVK/";

function setup() {
  let canvas = createCanvas(640, 520);
  canvas.parent("camera-container");
  canvas.elt.setAttribute("role", "img");
  canvas.elt.setAttribute("aria-label", "Live camera preview. Prediction appears below as text.");
  frameRate(15);
  document.getElementById("start-camera").addEventListener("click", startCamera);
  document.getElementById("stop-camera").addEventListener("click", stopCamera);
  setStatus(modelURL ? "Ready. Select Start camera." : "Our trained model has not been added yet.");
}

// Load the model and ask for camera permission only when someone presses Start.
async function startCamera() {
  if (!modelURL) {
    setStatus("Our trained model has not been added yet. Please return after it is uploaded.");
    return;
  }
  document.getElementById("start-camera").disabled = true;
  try {
    if (typeof ml5 === "undefined") {
      throw new Error("The ml5 library did not load. Check your connection and reload.");
    }
    if (!classifier) {
      setStatus("Loading our model...");
      classifier = ml5.imageClassifier(modelURL + "model.json");
      await classifier.ready;
      if (!classifier.model || typeof classifier.model.predict !== "function") {
        classifier = null;
        throw new Error("The model could not load. Check the exported model URL.");
      }
    }
    setStatus("Allow camera access when your browser asks.");
    // This replaces createCapture(VIDEO) so permission errors can be caught.
    // p5 still displays the video and canvas as in the supplied template.
    let stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false
    });
    video = createVideo([]);
    video.elt.muted = true;
    video.elt.setAttribute("playsinline", "");
    video.elt.srcObject = stream;
    video.size(640, 480);
    video.hide();
    await video.elt.play();
    running = true;
    document.getElementById("stop-camera").disabled = false;
    setStatus("Camera is on. Show a mug, a bottle, or neither object.");
    classifyVideo();
  } catch (error) {
    stopCamera();
    classifier = null;
    if (error.name === "NotAllowedError") {
      setStatus("Camera access was denied. Allow it in your browser settings, then try again.");
    } else if (error.name === "NotFoundError") {
      setStatus("No camera was found. Connect a camera and try again.");
    } else {
      setStatus(error.message || "Unable to start. Use the HTTPS website and check your camera.");
    }
    console.error(error);
  }
}

// STEP 2: Classify one video frame. The callback starts the next prediction.
function classifyVideo() {
  if (running) {
    let thisSession = session;
    classifier.classify(video, function(error, results) {
      if (thisSession === session) gotResults(error, results);
    });
  }
}

function draw() {
  background(8, 12, 9);
  if (running && video) {
    image(video, 0, 0, 640, 480);
  } else {
    fill(186, 201, 190);
    textSize(22);
    textAlign(CENTER, CENTER);
    text("Camera is off", width / 2, 240);
  }
  // STEP 4: Draw the label underneath the camera view.
  fill(124, 255, 155);
  textSize(22);
  textAlign(CENTER, CENTER);
  text(label, width / 2, height - 20);
}

// STEP 3: Get the classification and display the highest scoring label.
function gotResults(error, results) {
  if (!running) return;
  if (error || !results || results.length === 0) {
    stopCamera();
    setStatus("Prediction failed. Stop other camera apps and try again.");
    console.error(error);
    return;
  }
  label = results[0].label;
  confidence = results[0].confidence;
  document.getElementById("prediction").textContent = label;
  document.getElementById("confidence").textContent = (confidence * 100).toFixed(1) + "%";
  // A short pause keeps the page responsive instead of updating as fast as possible.
  let thisSession = session;
  setTimeout(function() {
    if (thisSession === session) classifyVideo();
  }, 200);
}

function stopCamera() {
  session++;
  running = false;
  if (video) {
    let stream = video.elt.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
    video.remove();
    video = null;
  }
  label = "Not running";
  document.getElementById("prediction").textContent = label;
  document.getElementById("confidence").textContent = "—";
  document.getElementById("start-camera").disabled = false;
  document.getElementById("stop-camera").disabled = true;
  setStatus("Camera stopped.");
}

function setStatus(message) {
  document.getElementById("model-status").textContent = message;
}

window.addEventListener("pagehide", stopCamera);
// Keep a readable message even if the p5 library fails to download.
if (typeof p5 === "undefined") {
  setStatus("The camera library could not load. Check your connection and reload this page.");
  document.getElementById("start-camera").disabled = true;
}
