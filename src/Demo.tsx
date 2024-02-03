import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, GestureRecognizer, DrawingUtils } from "@mediapipe/tasks-vision";
import gesture_recognizer_task from "./models/gesture_recognizer.task"

const Demo = () => {
    

    useEffect(() => {
        const demosSection = document.getElementById("demos");
        let gestureRecognizer: GestureRecognizer;
        let runningMode = "IMAGE";
        let enableWebcamButton: HTMLButtonElement;
        let webcamRunning: Boolean = false;
        const videoHeight = "360px";
        const videoWidth = "480px";
        const video = document.getElementById("webcam");
        const canvasElement = document.getElementById("output_canvas") as HTMLCanvasElement;
        const canvasCtx = canvasElement.getContext("2d");
        const gestureOutput = document.getElementById("gesture_output");

        const createGestureRecognizer = async () => {
            const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );
            gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                delegate: "GPU"
              },
              runningMode: "VIDEO"
            });
            demosSection.classList.remove("invisible");
          };
          createGestureRecognizer();

        // Check if webcam access is supported.
        function hasGetUserMedia() {
            return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        }
        
        // If webcam supported, add event listener to button for when user
        // wants to activate it.
        if (hasGetUserMedia()) {
            enableWebcamButton = document.getElementById("webcamButton");
            enableWebcamButton.addEventListener("click", enableCam);
        } else {
            console.warn("getUserMedia() is not supported by your browser");
        }
        
        // Enable the live webcam view and start detection.
        function enableCam(event) {
            if (!gestureRecognizer) {
            alert("Please wait for gestureRecognizer to load");
            return;
            }
        
            if (webcamRunning === true) {
            webcamRunning = false;
            enableWebcamButton.innerText = "ENABLE PREDICTIONS";
            } else {
            webcamRunning = true;
            enableWebcamButton.innerText = "DISABLE PREDICTIONS";
            }
        
            // getUsermedia parameters.
            const constraints = {
            video: true
            };
        
            // Activate the webcam stream.
            navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
            });
        }
        
        let lastVideoTime = -1;
        let results = undefined;
        async function predictWebcam() {
            const webcamElement = document.getElementById("webcam");
            // Now let's start detecting the stream.
            if (runningMode === "IMAGE") {
            runningMode = "VIDEO";
            await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
            }
            let nowInMs = Date.now();
            if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            results = gestureRecognizer.recognizeForVideo(video, nowInMs);
            }
        
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            const drawingUtils = new DrawingUtils(canvasCtx);
        
            canvasElement.style.height = videoHeight;
            webcamElement.style.height = videoHeight;
            canvasElement.style.width = videoWidth;
            webcamElement.style.width = videoWidth;
        
            if (results.landmarks) {
            for (const landmarks of results.landmarks) {
                drawingUtils.drawConnectors(
                landmarks,
                GestureRecognizer.HAND_CONNECTIONS,
                {
                    color: "#00FF00",
                    lineWidth: 5
                }
                );
                drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 2
                });
            }
            }
            canvasCtx.restore();
            if (results.gestures.length > 0) {
            gestureOutput.style.display = "block";
            gestureOutput.style.width = videoWidth;
            const categoryName = results.gestures[0][0].categoryName;
            const categoryScore = parseFloat(
                results.gestures[0][0].score * 100
            ).toFixed(2);
            const handedness = results.handednesses[0][0].displayName;
            gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
            } else {
            gestureOutput.style.display = "none";
            }
            // Call this function again to keep predicting when the browser is ready.
            if (webcamRunning === true) {
            window.requestAnimationFrame(predictWebcam);
            }
        }
    }, []);

    return (
        <>
        <link href="https://unpkg.com/material-components-web@latest/dist/material-components-web.min.css" rel="stylesheet"/>
        <script src="https://unpkg.com/material-components-web@latest/dist/material-components-web.min.js"></script>

        <h1>Recognize hand gestures using the MediaPipe HandGestureRecognizer task</h1>

        <section id="demos" className="invisible">
        <h2>Demo: Recognize gestures</h2>
        <p><em>Click on an image below</em> to identify the gestures in the image.</p>

        <div className="detectOnClick">
            <img src="https://assets.codepen.io/9177687/idea-gcbe74dc69_1920.jpg" crossOrigin="anonymous" title="Click to get recognize!" />
            <p className="classification removed"/>
        </div>
        <div className="detectOnClick">
            <img src="https://assets.codepen.io/9177687/thumbs-up-ga409ddbd6_1.png" crossOrigin="anonymous" title="Click to get recognize!" />
            <p className="classification removed"/>
        </div>

        <h2>Demo: Webcam continuous hand gesture detection</h2>
        <p>Use your hand to make gestures in front of the camera to get gesture classification. Click <b>enable webcam</b> below and grant access to the webcam if prompted.</p>

        <div id="liveView" className="videoView">
            <button id="webcamButton" className="mdc-button mdc-button--raised">
            <span className="mdc-button__ripple"></span>
            <span className="mdc-button__label">ENABLE WEBCAM</span>
            </button>
            <div style={{position: "relative"}}>
            <video id="webcam" autoPlay playsInline></video>
            <canvas className="output_canvas" id="output_canvas" width="1280" height="720" style={{position: "absolute", left: "0px", top: "0px"}}></canvas>
            <p id='gesture_output' className="output"/>
            </div>
        </div>
        </section>
        </>
    );
};

export default Demo;