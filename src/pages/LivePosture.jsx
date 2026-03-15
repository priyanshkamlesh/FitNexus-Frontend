import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Square, Play, Activity } from "lucide-react";
import { API_BASE_URL } from "../config";
import { useTheme } from "../theme/ThemeProvider";

const DIFF_THRESHOLD = 28;
const ACTIVE_MOTION_THRESHOLD = 0.028;
const VERY_LOW_MOTION_THRESHOLD = 0.008;
const HIGH_MOTION_THRESHOLD = 0.2;
const EXERCISE_ACTIVITY_RATIO_THRESHOLD = 0.28;
const PERSON_VISIBLE_AREA_THRESHOLD = 0.035;
const CLASSIFICATION_INTERVAL_MS = 1400;
const CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.55;

const formatExerciseName = (value) =>
  value
    ? value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "";

const formatPhaseName = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

const Navbar = ({ dark }) => (
  <nav className={`p-4 rounded-lg mb-8 border shadow-md ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-slate-200"}`}>
    <div className="max-w-6xl mx-auto flex justify-between items-center">
      <a href="/home" className={`flex items-center gap-2 transition-colors ${dark ? "text-cyan-300 hover:text-cyan-200" : "text-cyan-700 hover:text-cyan-600"}`}>
        <ArrowLeft className="w-4 h-4" />
        <span className="font-semibold">Back to Home</span>
      </a>
      <div className="flex items-center gap-4">
        <a
          href="/home"
          className={dark ? "text-gray-300 hover:text-cyan-400 transition-colors" : "text-slate-600 hover:text-cyan-700 transition-colors"}
        >
          Home
        </a>
        <a
          href="/analysis"
          className={dark ? "text-gray-300 hover:text-cyan-400 transition-colors" : "text-slate-600 hover:text-cyan-700 transition-colors"}
        >
          Analysis
        </a>
        <a
          href="/live-posture"
          className={dark ? "text-cyan-400 font-semibold border-b border-cyan-400" : "text-cyan-700 font-semibold border-b border-cyan-700"}
        >
          Live Posture
        </a>
        <a
          href="/dashboard"
          className={dark ? "text-gray-300 hover:text-cyan-400 transition-colors" : "text-slate-600 hover:text-cyan-700 transition-colors"}
        >
          Dashboard
        </a>
        <a
          href="/profile"
          className={dark ? "text-gray-300 hover:text-cyan-400 transition-colors" : "text-slate-600 hover:text-cyan-700 transition-colors"}
        >
          Profile
        </a>
      </div>
    </div>
  </nav>
);

function getSessionFeedback(metrics, durationSec, classificationSummary) {
  const {
    totalFrames,
    activeFrames,
    pauseEvents,
    leftDominantFrames,
    rightDominantFrames,
    meanMotion,
    meanActivityArea,
  } = metrics;

  const activityRatio = totalFrames ? activeFrames / totalFrames : 0;
  const lrTotal = leftDominantFrames + rightDominantFrames;
  const imbalanceRatio = lrTotal
    ? Math.abs(leftDominantFrames - rightDominantFrames) / lrTotal
    : 0;
  const motionBasedExerciseDetected =
    durationSec >= 12 &&
    activityRatio >= EXERCISE_ACTIVITY_RATIO_THRESHOLD &&
    meanMotion >= 0.015 &&
    meanActivityArea >= PERSON_VISIBLE_AREA_THRESHOLD;
  const exerciseDetected =
    classificationSummary?.exerciseDetected ?? motionBasedExerciseDetected;

  const mistakes = [];
  let activityLabel = "No clear activity detected";

  if (meanActivityArea < 0.02) {
    activityLabel = "The person is not clearly visible in the camera";
  } else if (exerciseDetected) {
    activityLabel = "Exercise-like movement detected";
  } else if (activityRatio < 0.08 && meanMotion < 0.01) {
    activityLabel = "The user is mostly standing still";
  } else if (activityRatio < 0.18) {
    activityLabel = "The user is making small body movements or adjusting position";
  } else if (meanMotion > HIGH_MOTION_THRESHOLD) {
    activityLabel = "The user is moving quickly, but it does not look like a steady exercise set";
  } else {
    activityLabel = "The user is moving around, but no clear exercise pattern was detected";
  }

  if (classificationSummary?.exerciseDetected && classificationSummary.exerciseName) {
    activityLabel = `${formatExerciseName(classificationSummary.exerciseName)} detected`;
  } else if (classificationSummary?.activityLabel) {
    activityLabel = classificationSummary.activityLabel;
  }

  if (exerciseDetected) {
    if (durationSec < 20) {
      mistakes.push("This set was a bit short. Record a little longer for better advice.");
    }
    if (activityRatio < 0.3) {
      mistakes.push("You paused a lot between reps. Try to keep a steady rhythm.");
    }
    if (pauseEvents >= 3) {
      mistakes.push("There were too many long stops. Try to keep moving smoothly.");
    }
    if (meanMotion < 0.02) {
      mistakes.push("Your movement looked a little short. Try to complete each rep fully.");
    }
    if (meanMotion > HIGH_MOTION_THRESHOLD) {
      mistakes.push("You moved too fast in some parts. Slow down a little for better control.");
    }
    if (imbalanceRatio > 0.28) {
      mistakes.push("Your body looked uneven from left to right. Try to keep your weight balanced.");
    }
  } else {
    mistakes.push(activityLabel);
    if (meanActivityArea < 0.05) {
      mistakes.push("Move a little closer so the camera can see your body clearly.");
    } else if (meanActivityArea > 0.72) {
      mistakes.push("Step back a little so your full body stays inside the frame.");
    }
    if (durationSec < 10) {
      mistakes.push("Stay in view for a few more seconds so the camera can understand your movement better.");
    }
  }

  return {
    exerciseDetected,
    activityLabel,
    detectedExercise: classificationSummary?.exerciseName || null,
    detectedPhase: classificationSummary?.phase || "",
    mistakes,
    stats: {
      activityPercent: Math.round(activityRatio * 100),
      pauseEvents,
      balanceScore: Math.max(0, Math.round((1 - imbalanceRatio) * 100)),
      avgMotion: Number(meanMotion.toFixed(3)),
    },
  };
}

export default function LivePosture() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const isRunningRef = useRef(false);
  const prevFrameRef = useRef(null);
  const lastPauseFlagRef = useRef(false);
  const startTimeRef = useRef(null);
  const motionHistoryRef = useRef([]);
  const classificationInFlightRef = useRef(false);
  const lastClassificationAtRef = useRef(0);
  const exerciseVotesRef = useRef({});
  const liveStateRef = useRef("Idle");

  const metricsRef = useRef({
    totalFrames: 0,
    activeFrames: 0,
    pauseEvents: 0,
    leftDominantFrames: 0,
    rightDominantFrames: 0,
    motionSum: 0,
    activityAreaSum: 0,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [liveMotion, setLiveMotion] = useState(0);
  const [liveState, setLiveState] = useState("Idle");
  const [elapsed, setElapsed] = useState(0);
  const [report, setReport] = useState(null);
  const [detectedExercise, setDetectedExercise] = useState("Not detected");
  const [detectedPhase, setDetectedPhase] = useState("");
  const [detectionConfidence, setDetectionConfidence] = useState(0);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    liveStateRef.current = liveState;
  }, [liveState]);

  useEffect(() => {
    let timerId;
    if (isRunning) {
      timerId = setInterval(() => {
        if (!startTimeRef.current) return;
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isRunning]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const classifyCurrentFrame = async (canvas) => {
    const now = Date.now();
    if (
      classificationInFlightRef.current ||
      now - lastClassificationAtRef.current < CLASSIFICATION_INTERVAL_MS
    ) {
      return;
    }

    classificationInFlightRef.current = true;
    lastClassificationAtRef.current = now;

    try {
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.7);
      const res = await fetch(`${API_BASE_URL}/classify_exercise_frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
      });

      if (!res.ok) return;
      const data = await res.json();
      if (!data?.exercise) return;

      const friendlyExercise = formatExerciseName(data.exercise);
      setDetectedExercise(friendlyExercise || "Not detected");
      setDetectedPhase(formatPhaseName(data.phase));
      setDetectionConfidence(Math.round((data.confidence || 0) * 100));

      if ((data.confidence || 0) >= CLASSIFICATION_CONFIDENCE_THRESHOLD) {
        exerciseVotesRef.current[data.exercise] =
          (exerciseVotesRef.current[data.exercise] || 0) + 1;
      }
    } catch {
      // Ignore transient live-classification errors and keep the session running.
    } finally {
      classificationInFlightRef.current = false;
    }
  };

  const buildClassificationSummary = () => {
    const entries = Object.entries(exerciseVotesRef.current).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      return {
        exerciseDetected: false,
        exerciseName: null,
        phase: "",
        activityLabel: liveStateRef.current || "No clear activity detected",
      };
    }

    const totalVotes = entries.reduce((sum, [, count]) => sum + count, 0);
    const [topExercise, topCount] = entries[0];
    const ratio = totalVotes ? topCount / totalVotes : 0;

    return {
      exerciseDetected: topCount >= 2 && ratio >= 0.45,
      exerciseName: topExercise,
      phase: detectedPhase.toLowerCase(),
      activityLabel:
        topCount >= 2 && ratio >= 0.45
          ? `${formatExerciseName(topExercise)} detected`
          : liveStateRef.current || "Movement detected",
    };
  };

  const analyzeFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !isRunningRef.current) {
      rafRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const targetWidth = 320;
    const targetHeight = 240;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const overlayCanvas = overlayCanvasRef.current;
    if (overlayCanvas) {
      overlayCanvas.width = targetWidth;
      overlayCanvas.height = targetHeight;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const frame = ctx.getImageData(0, 0, targetWidth, targetHeight).data;

    const prevFrame = prevFrameRef.current;
    if (!prevFrame) {
      prevFrameRef.current = new Uint8ClampedArray(frame);
      rafRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    let total = 0;
    let changed = 0;
    let leftChanged = 0;
    let rightChanged = 0;
    let minX = targetWidth;
    let minY = targetHeight;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < targetHeight; y += 3) {
      for (let x = 0; x < targetWidth; x += 3) {
        const i = (y * targetWidth + x) * 4;

        const currGray = frame[i] * 0.299 + frame[i + 1] * 0.587 + frame[i + 2] * 0.114;
        const prevGray = prevFrame[i] * 0.299 + prevFrame[i + 1] * 0.587 + prevFrame[i + 2] * 0.114;
        const diff = Math.abs(currGray - prevGray);

        total += 1;
        if (diff > DIFF_THRESHOLD) {
          changed += 1;
          if (x < targetWidth / 2) leftChanged += 1;
          else rightChanged += 1;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    prevFrameRef.current = new Uint8ClampedArray(frame);

    const motionScore = total ? changed / total : 0;
    let activityArea = 0;
    let hasLandmarks = false;
    if (changed > 20) {
      const bw = Math.max(1, maxX - minX);
      const bh = Math.max(1, maxY - minY);
      activityArea = (bw * bh) / (targetWidth * targetHeight);
      hasLandmarks = true;
    }

    const m = metricsRef.current;
    m.totalFrames += 1;
    m.motionSum += motionScore;
    m.activityAreaSum += activityArea;

    motionHistoryRef.current = [...motionHistoryRef.current.slice(-14), motionScore];
    const recentAverage =
      motionHistoryRef.current.reduce((sum, value) => sum + value, 0) /
      motionHistoryRef.current.length;

    if (activityArea < 0.02 && recentAverage < VERY_LOW_MOTION_THRESHOLD) {
      setLiveState("No person detected");
    } else if (recentAverage > ACTIVE_MOTION_THRESHOLD * 1.25) {
      setLiveState("Exercise detected");
    } else if (recentAverage > VERY_LOW_MOTION_THRESHOLD * 2) {
      setLiveState("Light movement");
    } else if (activityArea >= PERSON_VISIBLE_AREA_THRESHOLD) {
      setLiveState("Standing / waiting");
    } else {
      setLiveState("Getting ready");
    }

    if (motionScore > ACTIVE_MOTION_THRESHOLD) {
      m.activeFrames += 1;
    }

    if (motionScore < VERY_LOW_MOTION_THRESHOLD) {
      if (!lastPauseFlagRef.current && m.totalFrames % 60 === 0) {
        m.pauseEvents += 1;
        lastPauseFlagRef.current = true;
      }
    } else {
      lastPauseFlagRef.current = false;
    }

    if (leftChanged > rightChanged * 1.5 && motionScore > ACTIVE_MOTION_THRESHOLD) {
      m.leftDominantFrames += 1;
    }
    if (rightChanged > leftChanged * 1.5 && motionScore > ACTIVE_MOTION_THRESHOLD) {
      m.rightDominantFrames += 1;
    }

    if (overlayCanvas) {
      const octx = overlayCanvas.getContext("2d");
      octx.clearRect(0, 0, targetWidth, targetHeight);

      if (hasLandmarks) {
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const points = [
          [minX, minY],
          [maxX, minY],
          [minX, maxY],
          [maxX, maxY],
          [cx, minY],
          [cx, maxY],
          [minX, cy],
          [maxX, cy],
          [cx, cy],
        ];

        octx.strokeStyle = "rgba(34, 211, 238, 0.9)";
        octx.lineWidth = 2;
        octx.strokeRect(minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY));

        octx.fillStyle = "rgba(34, 211, 238, 0.95)";
        points.forEach(([px, py]) => {
          octx.beginPath();
          octx.arc(px, py, 3, 0, Math.PI * 2);
          octx.fill();
        });
      }
    }

    setLiveMotion(motionScore);
    if (hasLandmarks) {
      classifyCurrentFrame(canvas);
    }
    rafRef.current = requestAnimationFrame(analyzeFrame);
  };

  const startCamera = async () => {
    setPermissionError("");
    setReport(null);
    setElapsed(0);
    prevFrameRef.current = null;
    lastPauseFlagRef.current = false;
    motionHistoryRef.current = [];
    classificationInFlightRef.current = false;
    lastClassificationAtRef.current = 0;
    exerciseVotesRef.current = {};
    setLiveState("Getting ready");
    setDetectedExercise("Checking...");
    setDetectedPhase("");
    setDetectionConfidence(0);
    metricsRef.current = {
      totalFrames: 0,
      activeFrames: 0,
      pauseEvents: 0,
      leftDominantFrames: 0,
      rightDominantFrames: 0,
      motionSum: 0,
      activityAreaSum: 0,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      startTimeRef.current = Date.now();
      setIsRunning(true);
      isRunningRef.current = true;
      rafRef.current = requestAnimationFrame(analyzeFrame);
    } catch (err) {
      setPermissionError("Camera access denied or unavailable on this device.");
      setIsRunning(false);
    }
  };

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const durationSec = startTimeRef.current
      ? Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000))
      : elapsed;

    setIsRunning(false);
    isRunningRef.current = false;
    setLiveState("Idle");
    setLiveMotion(0);
    startTimeRef.current = null;
    if (overlayCanvasRef.current) {
      const octx = overlayCanvasRef.current.getContext("2d");
      octx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }

    const m = metricsRef.current;
    const total = Math.max(1, m.totalFrames);
    const session = {
      ...m,
      meanMotion: m.motionSum / total,
      meanActivityArea: m.activityAreaSum / total,
    };

    if (m.totalFrames > 0) {
      setReport(getSessionFeedback(session, durationSec, buildClassificationSummary()));
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 ${dark ? "bg-slate-900 text-gray-200" : "bg-slate-100 text-slate-800"}`}>
      <div className="max-w-5xl mx-auto">
        <Navbar dark={dark} />

        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            Live Posture Detection
          </h1>
          <p className={dark ? "text-gray-400 mt-2" : "text-slate-500 mt-2"}>
            Start camera tracking, perform your exercise, then stop to get your mistake report.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={dark ? "bg-slate-800 border border-gray-700 rounded-xl p-4 shadow-lg" : "bg-white border border-slate-200 rounded-xl p-4 shadow-lg"}>
            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 relative">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              {!isRunning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65">
                  <Camera className="w-10 h-10 text-cyan-300 mb-2" />
                  <p className="text-sm text-gray-300">Camera preview will appear here</p>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {permissionError && (
              <p className="text-red-400 text-sm mt-3">{permissionError}</p>
            )}

            <div className="flex flex-wrap gap-3 mt-4">
              {!isRunning ? (
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  <Play className="w-4 h-4" />
                  Start Detection
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  <Square className="w-4 h-4" />
                  Stop & Analyze
                </button>
              )}
            </div>
          </div>

          <div className={dark ? "bg-slate-800 border border-gray-700 rounded-xl p-5 shadow-lg" : "bg-white border border-slate-200 rounded-xl p-5 shadow-lg"}>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-300" />
              Live Activity
            </h2>

            <div className="space-y-4">
              <p className={dark ? "text-gray-300" : "text-slate-600"}>
                Status: <span className={dark ? "font-semibold text-white" : "font-semibold text-slate-900"}>{liveState}</span>
              </p>
              <p className={dark ? "text-gray-300" : "text-slate-600"}>
                Elapsed Time: <span className={dark ? "font-semibold text-white" : "font-semibold text-slate-900"}>{elapsed}s</span>
              </p>
              <p className={dark ? "text-gray-300" : "text-slate-600"}>
                Detected Exercise:{" "}
                <span className={dark ? "font-semibold text-white" : "font-semibold text-slate-900"}>{detectedExercise}</span>
                {detectedPhase && (
                  <span className="ml-2 text-xs text-cyan-300">Phase: {detectedPhase}</span>
                )}
              </p>
              <p className={dark ? "text-xs text-gray-400" : "text-xs text-slate-500"}>
                Confidence: {detectionConfidence}%
              </p>
              <div>
                <p className={dark ? "text-gray-300 mb-2" : "text-slate-600 mb-2"}>Movement Intensity</p>
                <div className={dark ? "w-full h-3 rounded-full bg-slate-700 overflow-hidden" : "w-full h-3 rounded-full bg-slate-200 overflow-hidden"}>
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150"
                    style={{ width: `${Math.min(100, liveMotion * 500)}%` }}
                  />
                </div>
                <p className={dark ? "text-xs text-gray-400 mt-1" : "text-xs text-slate-500 mt-1"}>
                  Score: {liveMotion.toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {report && (
          <section className={dark ? "mt-8 bg-slate-800 border border-cyan-500/30 rounded-xl p-6 shadow-xl" : "mt-8 bg-white border border-cyan-200 rounded-xl p-6 shadow-xl"}>
          <h3 className="text-2xl font-bold text-cyan-300 mb-4">Session Report</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className={dark ? "bg-slate-700/70 rounded-lg p-3" : "bg-slate-100 rounded-lg p-3"}>
                <p className={dark ? "text-xs text-gray-400" : "text-xs text-slate-500"}>Activity %</p>
                <p className={dark ? "text-xl font-bold text-white" : "text-xl font-bold text-slate-900"}>{report.stats.activityPercent}%</p>
              </div>
              <div className={dark ? "bg-slate-700/70 rounded-lg p-3" : "bg-slate-100 rounded-lg p-3"}>
                <p className={dark ? "text-xs text-gray-400" : "text-xs text-slate-500"}>Pause Events</p>
                <p className={dark ? "text-xl font-bold text-white" : "text-xl font-bold text-slate-900"}>{report.stats.pauseEvents}</p>
              </div>
              <div className={dark ? "bg-slate-700/70 rounded-lg p-3" : "bg-slate-100 rounded-lg p-3"}>
                <p className={dark ? "text-xs text-gray-400" : "text-xs text-slate-500"}>Balance Score</p>
                <p className={dark ? "text-xl font-bold text-white" : "text-xl font-bold text-slate-900"}>{report.stats.balanceScore}/100</p>
              </div>
              <div className={dark ? "bg-slate-700/70 rounded-lg p-3" : "bg-slate-100 rounded-lg p-3"}>
                <p className={dark ? "text-xs text-gray-400" : "text-xs text-slate-500"}>Avg Motion</p>
                <p className={dark ? "text-xl font-bold text-white" : "text-xl font-bold text-slate-900"}>{report.stats.avgMotion}</p>
              </div>
            </div>

            <h4 className={dark ? "font-semibold text-lg mb-2 text-white" : "font-semibold text-lg mb-2 text-slate-900"}>
              {report.exerciseDetected ? "Easy Tips to Improve" : "What We Detected"}
            </h4>
            <p className={dark ? "mb-3 text-sm text-gray-300" : "mb-3 text-sm text-slate-600"}>
              {report.activityLabel}
            </p>
            {report.detectedExercise && (
              <p className="mb-3 text-sm text-cyan-300">
                Recognized exercise: {formatExerciseName(report.detectedExercise)}
                {report.detectedPhase ? ` (${formatPhaseName(report.detectedPhase)})` : ""}
              </p>
            )}
            <ul className="space-y-2">
              {report.mistakes.map((item, idx) => (
                <li
                  key={`${item}-${idx}`}
                  className={dark ? "bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-gray-200" : "bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-slate-700"}
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
