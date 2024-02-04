import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, GestureRecognizer, DrawingUtils } from "@mediapipe/tasks-vision";
import gesture_recognizer_task from "./models/shooting_resting-4.task"
import useWebSocket, { ReadyState } from 'react-use-websocket';

const Demo = () => {
    
    const [socketUrl, setSocketUrl] = useState('ws://localhost:1730');
    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

    useEffect(() => {
        const demosSection = document.getElementById("demos");
        let gestureRecognizer: GestureRecognizer;
        let enableWebcamButton: HTMLButtonElement;
        let webcamRunning: Boolean = false;
        const videoHeight = "720px";
        const videoWidth = "1080px";
        const video = document.getElementById("webcam");
        const canvasElement = document.getElementById("output_canvas") as HTMLCanvasElement;
        const canvasCtx = canvasElement.getContext("2d");
        const gestureOutput = document.getElementById("gesture_output");

        const flipVideo = async () => {
            video.style.transform = 'scaleX(-1)';
        }

        const createGestureRecognizer = async () => {
            const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );
            gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  gesture_recognizer_task,
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
            webcamRunning = true
            enableWebcamButton.style.display = "none";
        
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
        let palm = undefined
        let shot = false
        async function predictWebcam() {
            const webcamElement = document.getElementById("webcam");
            let nowInMs = Date.now();
            if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;

            flipVideo()

            results = gestureRecognizer.recognizeForVideo(video, nowInMs);
            
            if (results.gestures.length > 0 && results.gestures[0][0].categoryName == "resting" && shot == false){
                console.log("BANG")
                palm = results.landmarks[0][5]
                // already shot
                shot = true

                sendMessage({
                    "shoot" : true, "position" : [palm.x, palm.y, palm.z]
                })
            }
            else if (results.gestures.length > 0) {
                palm = results.landmarks[0][5]

                if (results.gestures[0][0].categoryName == "shooting") {
                    // ready to shoot
                    shot = false
                }

                sendMessage({
                    "shoot" : false, "position" : [palm.x, palm.y, palm.z]
                })
            }
            }
        
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            const drawingUtils = new DrawingUtils(canvasCtx);
        
            canvasElement.style.height = videoHeight;
            webcamElement.style.height = videoHeight;
            canvasElement.style.width = videoWidth;
            webcamElement.style.width = videoWidth;
        
            // if (results.landmarks) {
            // for (const landmarks of results.landmarks) {
            //     drawingUtils.drawConnectors(
            //     landmarks,
            //     GestureRecognizer.HAND_CONNECTIONS,
            //     {
            //         color: "#00FF00",
            //         lineWidth: 5
            //     }
            //     );
            //     drawingUtils.drawLandmarks(landmarks, {
            //     color: "#FF0000",
            //     lineWidth: 2
            //     });
            // }
            // }
            canvasCtx.restore();
            // if (results.gestures.length > 0) {
            // gestureOutput.style.display = "block";
            // gestureOutput.style.width = videoWidth;
            // const categoryName = results.gestures[0][0].categoryName;
            // const categoryScore = parseFloat(
            //     results.gestures[0][0].score * 100
            // ).toFixed(2);
            // const handedness = results.handednesses[0][0].displayName;
            // gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
            // } else {
            gestureOutput.style.display = "none";
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

        <h1>Trigger Finger Tango</h1>

        <section id="demos" className="invisible">
            
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