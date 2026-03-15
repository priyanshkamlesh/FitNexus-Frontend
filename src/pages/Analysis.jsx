// src/Analysis.jsx

import React, { useState, useEffect } from "react";
import mermaid from "mermaid";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  Target,
  Loader2,
  AlertOctagon,
  ArrowLeft,
  CheckCircle,
  Image as ImageIcon,
  Video,
  Lightbulb,
  Bot,
  Check,
  X,
} from "lucide-react";
import ExamDetails from "./exam_details";
import ExerciseVideo from "./ExerciseVideo";

const SaveScorePopup = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-cyan-400 rounded-2xl shadow-xl p-8 text-center animate-fadeIn">
        <CheckCircle className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Score Saved</h2>
        <p className="text-gray-300">Your score has been added to the dashboard.</p>
      </div>
    </div>
  );
};


const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL || "http://localhost:5001";

mermaid.initialize({
  startOnLoad: true,
  theme: "dark",
});

const JOINT_LABELS = {
  nose: "Head",
  l_sh: "Left shoulder",
  r_sh: "Right shoulder",
  l_elbow: "Left elbow",
  r_elbow: "Right elbow",
  l_wrist: "Left wrist",
  r_wrist: "Right wrist",
  l_hip: "Left hip",
  r_hip: "Right hip",
  l_knee: "Left knee",
  r_knee: "Right knee",
  l_ankle: "Left ankle",
  r_ankle: "Right ankle",
};

// Extract a frame from a video for analysis
const extractFrameFromVideo = (videoFile) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.currentTime = Math.min(1, (video.duration || 1) * 0.2);
    };

    video.onseeked = () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const frameFile = new File([blob], "video_frame.jpg", {
                type: "image/jpeg",
              });
              URL.revokeObjectURL(video.src);
              resolve(frameFile);
            } else reject(new Error("Could not extract frame."));
          },
          "image/jpeg",
          0.9
        );
      } catch (e) {
        reject(new Error("Failed to capture frame."));
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video."));
    };

    video.load();
  });
};

// Navbar (unchanged)
const Navbar = () => (
  <nav className="bg-slate-800 p-4 rounded-lg mb-8 border border-gray-700 shadow-md">
    <div className="max-w-6xl mx-auto flex justify-between items-center">
      <a href="/home" className="flex items-center gap-3 group">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5.8 11.3c.9-2.2 3.2-3.8 5.7-3.8s4.8 1.6 5.7 3.8c.2.6.2 1.3 0 1.9-.9 2.2-3.2 3.8-5.7 3.8s-4.8-1.6-5.7-3.8c-.2-.6-.2-1.3 0-1.9z" />
          <path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
        </svg>
        <span className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
          ASPIRANTS POSTURE DETECTION
        </span>
      </a>
      <div className="flex items-center gap-4">
        <a
          href="/home"
          className="text-gray-300 hover:text-cyan-400 transition-colors"
        >
          Home
        </a>
        <a
          href="/analysis"
          className="text-cyan-400 font-semibold border-b border-cyan-400"
        >
          Analysis
        </a>
        <a
          href="/yoga"
          className="text-gray-300 hover:text-cyan-400 transition-colors"
        >
          Yoga
        </a>
        <a
          href="/dashboard"
          className="text-gray-300 hover:text-cyan-400 transition-colors"
        >
          Dashboard
        </a>
        <a
          href="/profile"
          className="text-gray-300 hover:text-cyan-400 transition-colors"
        >
          Profile
        </a>
      </div>
    </div>
  </nav>
);

// Circular progress ring
const CircularProgress = ({ score }) => {
  const [progress, setProgress] = useState(0);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    const t = setTimeout(() => setProgress(score || 0), 100);
    return () => clearTimeout(t);
  }, [score]);

  let strokeColor = "stroke-red-500";
  if (progress > 40) strokeColor = "stroke-yellow-500";
  if (progress > 75) strokeColor = "stroke-green-500";
  if (progress > 95) strokeColor = "stroke-cyan-400";

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <svg className="w-full h-full" viewBox="0 0 120 120">
        <circle
          className="text-gray-700"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="60"
          cy="60"
        />
        <circle
          className={`transition-all duration-1000 ease-out ${strokeColor}`}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="60"
          cy="60"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <span className="absolute text-4xl font-bold text-white">
        {Math.round(progress)}
        <span className="text-2xl">%</span>
      </span>
    </div>
  );
};

function MermaidChart({ chart }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && chart) {
      ref.current.removeAttribute("data-processed");
      mermaid.contentLoaded();
    }
  }, [chart]);

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-500/50 rounded-xl p-6 shadow-2xl shadow-cyan-500/20 overflow-x-auto hover:shadow-cyan-500/40 transition-shadow duration-300">
      <div className="mermaid text-cyan-100" ref={ref}>
        {chart}
      </div>
    </div>
  );
}

const normalizeTipText = (text = "") =>
  text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();

const formatJointLabel = (text = "") => {
  const normalized = text.toLowerCase();
  const match = Object.entries(JOINT_LABELS).find(([, label]) =>
    normalized.includes(label.toLowerCase())
  );
  return match ? match[1] : "";
};

const extractImprovementSteps = (tipsText, feedback = []) => {
  const fromTips = tipsText
    .split(/\n+/)
    .map((line) => normalizeTipText(line))
    .filter((line) => line.length > 10)
    .map((line, index) => {
      const withoutBullet = line.replace(/^(\d+[\).\s-]+|[-•]\s*)/, "").trim();
      return {
        id: `tip-${index}`,
        title: `Step ${index + 1}`,
        detail: withoutBullet,
        joint: formatJointLabel(withoutBullet),
      };
    });

  if (fromTips.length > 0) {
    return fromTips.slice(0, 6);
  }

  return feedback
    .filter((item) => item?.tip)
    .slice(0, 6)
    .map((item, index) => ({
      id: `feedback-${index}`,
      title: `Step ${index + 1}`,
      detail: normalizeTipText(item.tip),
      joint: item.joint || "",
    }));
};

function Analysis() {
  const navigate = useNavigate();
  const [step, setStep] = useState("examDetails"); // 'selection' | 'fileUpload' | 'results'

  const [showFlowchart, setShowFlowchart] = useState(false);

  const handleShowFlowchart = () => {
    setShowFlowchart(true);
  };
  const [selectedExam, setSelectedExam] = useState(null);
  // steps + upload

  const [uploadType, setUploadType] = useState(null); // 'image' | 'video'
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file selected");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // results
  const [result, setResult] = useState(null);
  const [idealImageVisible, setIdealImageVisible] = useState(false);
  const [idealImageSrc, setIdealImageSrc] = useState("");
  const [idealImageLoading, setIdealImageLoading] = useState(false);

  // AI tips state
  const [aiTips, setAiTips] = useState("");
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState("");
  const [showScoreSavedPopup, setShowScoreSavedPopup] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File is too large (max 50MB).");
      setFile(null);
      setFileName("No file selected");
      return;
    }
    setError(null);
    setFile(selectedFile);
    setFileName(selectedFile.name);
  };


  const feedbackItems = Array.isArray(result?.feedback)
    ? result.feedback
    : result?.analyses?.[result.analyses.length - 1]?.feedback || [];

  const improvementSteps = extractImprovementSteps(aiTips, feedbackItems);

  const generateFlowchart = (steps) => {
    if (!result || !steps.length) return "";

    const currentScore = result.analyses
      ? Math.round(result.analyses.reduce((sum, a) => sum + a.posture_score, 0) / result.analyses.length)
      : result.posture_score;

    const jointEntries = Object.entries(
      result?.joint_status ||
      (result?.analyses?.[result.analyses.length - 1]?.joint_status) || {}
    );
    const issueCount = jointEntries.filter(([, status]) => status === "incorrect").length;

    const cleanLabel = (text) => {
      return text
        .replace(/[*#]/g, "")
        .replace(/[()]/g, "")
        .replace(/["']/g, "")
        .replace(/[:;]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, " ")
        .trim();
    };

    const shorten = (text) => {
      const words = text.split(" ");
      return words.slice(0, 6).join(" ") + (words.length > 6 ? "..." : "");
    };

    let chart = "flowchart TD\n";
    chart += `Start["Current Posture Score: ${currentScore}%"]\n`;
    chart += `Assess["Detected ${issueCount} alignment issue${issueCount === 1 ? "" : "s"}"]\n`;
    chart += `Start --> Assess\n`;

    let prev = "Assess";

    steps.forEach((step, i) => {
      const node = `Step${i}`;
      const focus = step.joint ? `${step.joint}: ` : "";
      const label = shorten(cleanLabel(`${focus}${step.detail}`));
      chart += `${node}["${i + 1}. ${label}"]\n`;
      chart += `${prev} --> ${node}\n`;
      prev = node;
    });

    chart += `${prev} --> End["Improved posture goal"]`;

    return chart;
  };

  const flowChart = generateFlowchart(improvementSteps);


  const handleFileUpload = async () => {
    if (!file) {
      setError("Please select an image or video file first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setIdealImageVisible(false);
    setIdealImageSrc("");
    setIdealImageLoading(false);
    setError(null);
    setAiTips("");
    setTipsError("");

    try {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        let message = `HTTP ${res.status}`;
        try {
          const err = JSON.parse(text);
          message = err?.error || message;
        } catch {
          message = text.slice(0, 200) || message;
        }
        throw new Error(message);
      }

      const data = await res.json();
      const normalized = {
        ...data,
        annotated_image:
          data.annotated_image ||
          (data.annotated_image_base64
            ? `data:image/jpeg;base64,${data.annotated_image_base64}`
            : undefined),
        corrected_skeleton_image:
          data.corrected_skeleton_image ||
          (data.corrected_skeleton_image_base64
            ? `data:image/jpeg;base64,${data.corrected_skeleton_image_base64}`
            : undefined),
        joint_status:
          data.joint_status && typeof data.joint_status === "object"
            ? data.joint_status
            : {},
      };

      setResult(normalized);
      setIdealImageVisible(false);
      setIdealImageSrc("");
      setIdealImageLoading(false);
      setStep("results");
    } catch (err) {
      setError(
        err.message ||
        "Error connecting to backend. Is the Python server running?"
      );
      setStep(uploadType === "image" ? "fileUpload" : "selection");
    } finally {
      setLoading(false);
    }
  };

  // Generate AI tips via backend (Groq on your Python side)
  const generateAiTips = async () => {
    if (!result) return;
    setTipsLoading(true);
    setTipsError("");
    setAiTips("");
    setShowFlowchart(false);

    try {
      const payload = {
        activity: "govt aspirant posture",
        posture_data: {
          score: result.posture_score,
          feedback: Array.isArray(result.feedback) ? result.feedback : [],
        },
      };

      const res = await fetch(`${API_BASE_URL}/generate_tips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = `HTTP ${res.status}`;
        try {
          const err = JSON.parse(text);
          message = err.error || message;
        } catch {
          message = text.slice(0, 200) || message;
        }
        throw new Error(message);
      }

      const data = await res.json();
      const tips = (data?.tips || "").replace(/\*/g, "").trim();
      if (!tips) throw new Error("Tips response was empty.");
      setAiTips(tips);
    } catch (e) {
      setTipsError(e.message || "Failed to generate tips. Please try again.");
    } finally {
      setTipsLoading(false);
    }
  };

  const handleTryAnother = () => {
    setStep("selection");
    setFile(null);
    setFileName("No file selected");
    setResult(null);
    setIdealImageVisible(false);
    setIdealImageSrc("");
    setIdealImageLoading(false);
    setError(null);
    setAiTips("");
    setTipsError("");
    setShowFlowchart(false);
  };

  const handleGenerateIdealImage = async () => {
    if (!result?.corrected_skeleton_image) return;
    setIdealImageLoading(true);

    // Keep a small delay to show intent/progress in UI.
    await new Promise((resolve) => setTimeout(resolve, 500));

    setIdealImageSrc(result.corrected_skeleton_image);
    setIdealImageVisible(true);
    setIdealImageLoading(false);
  };

  const saveScoreToDashboard = async () => {
    const scoreToSave = result.analyses
      ? Math.round(result.analyses.reduce((sum, a) => sum + a.posture_score, 0) / result.analyses.length)
      : result.posture_score;
    if (typeof scoreToSave !== "number") {
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: scoreToSave,
          meta: {
            activity: "govt aspirant posture",
          },
        }),
      });
      if (res.ok) {
        setShowScoreSavedPopup(true);
      } else {
        alert("⚠ Failed to save score. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving score.");
    }
  };

  const jointStatusEntries = Object.entries(
    result?.joint_status ||
    (result?.analyses && result.analyses.length > 0 ? result.analyses[result.analyses.length - 1].joint_status : {}) ||
    {}
  );
  const incorrectJointEntries = jointStatusEntries.filter(
    ([, status]) => status === "incorrect"
  );
  const correctJointEntries = jointStatusEntries.filter(
    ([, status]) => status === "correct"
  );
  const canGenerateIdealImage = Boolean(result?.corrected_skeleton_image);

  const buildVirtualCoachContext = () => {
    if (!result) return null;

    const score = result.analyses
      ? Math.round(
          result.analyses.reduce((sum, a) => sum + a.posture_score, 0) /
            result.analyses.length
        )
      : result.posture_score;

    const issues = incorrectJointEntries.map(([joint]) => JOINT_LABELS[joint] || joint);
    const aligned = correctJointEntries.map(([joint]) => JOINT_LABELS[joint] || joint);
    const feedback = (feedbackItems || [])
      .map((item) => ({
        joint: item?.joint || "Posture",
        tip: item?.tip || "",
      }))
      .filter((item) => item.tip);

    return {
      score,
      summary: result.summary || "",
      issues,
      aligned,
      feedback,
      steps: improvementSteps.map((step) => ({
        title: step.title,
        joint: step.joint,
        detail: step.detail,
      })),
      uploadType,
    };
  };

  const handleOpenVirtualCoach = () => {
    const postureContext = buildVirtualCoachContext();

    navigate("/virtual_coach", {
      state: postureContext ? { postureContext } : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200 p-4 md:p-8 font-sans">
      <Navbar />
      {showScoreSavedPopup && (
        <SaveScorePopup onDone={() => setShowScoreSavedPopup(false)} />
      )}

      <div className="max-w-6xl mx-auto">
        {step === "examDetails" && (
          <ExamDetails
            onExamSelected={(exam) => {
              setSelectedExam(exam);
              setStep("exerciseVideo");
            }}
          />
        )}
        {step === "exerciseVideo" && (
          <ExerciseVideo
            exam={selectedExam}
            onContinue={() => setStep("selection")}
            onBack={() => setStep("examDetails")}
          />
        )}
        {/* Step selection */}
        {step === "selection" && (
          <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-gray-700 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              Choose Upload Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => {
                  setUploadType("image");
                  setStep("fileUpload");
                }}
                className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-gray-700 rounded-lg hover:border-cyan-400 hover:shadow-cyan-500/40 shadow-md transition-all duration-300"
              >
                <ImageIcon className="w-10 h-10 text-cyan-400 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">
                  Upload Image
                </h3>
                <p className="text-gray-400 text-sm text-center">
                  Use a still photo of your study posture.
                </p>
              </button>

              <button
                onClick={() => {
                  setUploadType("video");
                  setStep("fileUpload");
                }}
                className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-gray-700 rounded-lg hover:border-cyan-400 hover:shadow-cyan-500/40 shadow-md transition-all duration-300"
              >
                <Video className="w-10 h-10 text-cyan-400 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">
                  Upload Video
                </h3>
                <p className="text-gray-400 text-sm text-center">
                  We’ll grab a frame from your study video.
                </p>
              </button>
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setStep("exerciseVideo")}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Back to Exercise Videos
              </button>
            </div>
          </div>
        )}

        {/* Step: file upload */}
        {step === "fileUpload" && (
          <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-gray-700 mb-6">
            <button
              className="flex items-center text-sm text-gray-400 hover:text-cyan-300 mb-4"
              onClick={() => {
                setStep("selection");
                setFile(null);
                setFileName("No file selected");
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>

            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              Upload {uploadType === "video" ? "Video" : "Image"} for Analysis
            </h2>
            <p className="text-gray-400 text-center mb-6">
              Supported formats:{" "}
              {uploadType === "video" ? "MP4, WebM" : "JPG, PNG"}
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 text-sm text-red-300 bg-red-900/60 border border-red-700 px-4 py-3 rounded-lg">
                <AlertOctagon className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <div className="w-full max-w-md">
                <label
                  htmlFor="fileInput"
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-cyan-400 hover:bg-slate-900/40 transition-colors"
                >
                  <UploadCloud className="w-10 h-10 text-cyan-400 mb-3" />
                  <span className="text-sm text-gray-300 mb-1">
                    Click to select{" "}
                    {uploadType === "video" ? "a video" : "an image"}
                  </span>
                  <span className="text-xs text-gray-500">{fileName}</span>
                  <input
                    id="fileInput"
                    type="file"
                    accept={
                      uploadType === "video" ? "video/*" : "image/*"
                    }
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={handleFileUpload}
                disabled={loading}
                className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 hover:shadow-cyan-500/50 transform transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />{" "}
                    Analyzing…
                  </>
                ) : (
                  "Analyze Posture"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: results */}
        {step === "results" && result && (
          <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-gray-700 transition-opacity duration-500 animate-fadeIn">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Analysis
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Score card */}
              <div className="flex flex-col items-center justify-center bg-slate-900/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-gray-300 mb-3">
                  Alignment Score
                </h3>
                {result.analyses ? (
                  // Video: show average score
                  <CircularProgress score={result.analyses.length > 0 ? Math.round(result.analyses.reduce((sum, a) => sum + a.posture_score, 0) / result.analyses.length) : 0} />
                ) : (
                  // Image: show single score
                  <CircularProgress score={result.posture_score} />
                )}
                <p className="text-center text-gray-400 mt-4">
                  {result.analyses ? "Average alignment accuracy across video." : "Your overall alignment accuracy."}
                </p>
              </div>

              {/* Feedback + AI tips */}
              <div>
                <h3 className="text-xl font-semibold text-gray-300 mb-3">
                  Alignment Tips
                </h3>
                {result.summary && (
                  <p className="text-gray-300 mb-4">{result.summary}</p>
                )}
                {Array.isArray(result.bad_posture_times) &&
                  result.bad_posture_times.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-red-300 mb-2">
                        Bad Posture Timestamps:
                      </h4>

                      <div className="flex flex-wrap gap-2">
                        {result.bad_posture_times.map((item, idx) => {
                          const time =
                            typeof item === "number"
                              ? item
                              : item?.timestamp ?? 0;

                          const issues =
                            typeof item === "object" && item?.issues
                              ? item.issues
                              : [];

                          return (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded bg-red-900/50 text-red-200 text-xs"
                            >
                              {time.toFixed(1)}s
                              {issues.length > 0 && (
                                <> — {issues.join(", ")}</>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                <div className="mb-4 flex flex-wrap gap-3 text-xs">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-900/50 text-red-200 border border-red-500/50">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2" />
                    Incorrect posture point
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-900/40 text-emerald-200 border border-emerald-500/50">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
                    Correct posture point
                  </span>
                </div>
                {!!jointStatusEntries.length && (
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-red-300">
                        Needs correction
                      </div>
                      <div className="mt-1 text-2xl font-bold text-white">
                        {incorrectJointEntries.length}
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-emerald-300">
                        Already aligned
                      </div>
                      <div className="mt-1 text-2xl font-bold text-white">
                        {correctJointEntries.length}
                      </div>
                    </div>
                  </div>
                )}
                {!!jointStatusEntries.length && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {jointStatusEntries.map(([joint, status]) => {
                      const isIncorrect = status === "incorrect";
                      return (
                        <span
                          key={joint}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${isIncorrect
                            ? "border-red-500/50 bg-red-900/40 text-red-100"
                            : "border-emerald-500/50 bg-emerald-900/30 text-emerald-100"
                            }`}
                        >
                          {isIncorrect ? (
                            <X className="h-3.5 w-3.5" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          {JOINT_LABELS[joint] || joint}
                        </span>
                      );
                    })}
                  </div>
                )}
                {(Array.isArray(result.feedback) && result.feedback.length > 0) ||
                  (result.analyses && result.analyses.length > 0 && Array.isArray(result.analyses[result.analyses.length - 1].feedback)) ? (
                  <ul className="space-y-4">
                    {(result.feedback || result.analyses[result.analyses.length - 1].feedback).map((item, index) => (
                      <li
                        key={index}
                        className="bg-slate-700 border border-gray-600 p-4 rounded-lg shadow-md transition-all duration-300 hover:shadow-red-500/20 hover:border-red-500 animate-fadeIn"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-start">
                          <Target className="w-6 h-6 text-red-500 mr-4 flex-shrink-0 mt-1" />
                          <div>
                            <h4 className="font-semibold text-white text-lg">
                              {item.joint}
                            </h4>
                            <p className="text-gray-300">{item.tip}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-green-600 to-emerald-700 border border-green-500 p-6 rounded-lg shadow-lg shadow-green-500/20 text-white">
                    <CheckCircle className="w-16 h-16 text-white mb-3" />
                    <h4 className="font-bold text-2xl text-center">
                      Perfect Posture!
                    </h4>
                    <p className="text-center text-lg mt-1">
                      Flawless Alignment!
                    </p>
                    <p className="text-green-100 text-center mt-2">
                      No issues detected.
                    </p>
                  </div>
                )}

                {/* AI Tips + Virtual Coach */}
                <div className="mt-6 space-y-3">
                  {!showFlowchart && (
                    <button
                      onClick={generateAiTips}
                      disabled={tipsLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-gray-100 border border-gray-600 transition disabled:opacity-60"
                    >
                      <Lightbulb className="w-4 h-4 text-yellow-300" />
                      {tipsLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating AI Tips…
                        </>
                      ) : (
                        <>Generate Improvement Tips</>
                      )}
                    </button>
                  )}

                  {tipsError && (
                    <div className="mt-2 p-3 rounded-md border border-red-400 bg-red-900/40 text-red-200 text-sm">
                      <strong>Error:</strong> {tipsError}
                    </div>
                  )}

                  {/* Show AI Tips First */}
                  {!!aiTips && !showFlowchart && (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 p-5 shadow-lg shadow-cyan-500/10">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              Your Improvement Plan
                            </h3>
                            <p className="mt-1 text-sm text-gray-400">
                              Follow these steps in order to improve posture quality.
                            </p>
                          </div>
                          <div className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                            {improvementSteps.length || 1} steps
                          </div>
                        </div>

                        {improvementSteps.length > 0 ? (
                          <div className="mt-5 space-y-3">
                            {improvementSteps.map((step, index) => (
                              <div
                                key={step.id}
                                className="rounded-xl border border-slate-600 bg-slate-900/70 p-4"
                              >
                                <div className="flex items-start gap-4">
                                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-bold text-cyan-300">
                                    {index + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-sm font-semibold uppercase tracking-wide text-white">
                                        {step.title}
                                      </h4>
                                      {step.joint && (
                                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                                          Focus: {step.joint}
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-gray-300">
                                      {step.detail}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-5 rounded-xl border border-slate-600 bg-slate-900/70 p-4 text-sm leading-6 text-gray-300 whitespace-pre-line">
                            {aiTips}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleShowFlowchart}
                        className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg shadow hover:scale-105 transition"
                      >
                        Visualize Posture Correction Steps
                      </button>
                    </div>
                  )}

                  {/* Show Flowchart After Button Click */}
                  {showFlowchart && (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-5">
                        <h3 className="text-lg font-semibold text-cyan-300">
                          Step-by-Step Posture Improvement Flow
                        </h3>
                        <p className="mt-1 text-sm text-gray-400">
                          Read the flow from top to bottom and fix each posture area in sequence.
                        </p>
                      </div>
                      <MermaidChart chart={flowChart} />
                      {!!improvementSteps.length && (
                        <div className="grid gap-3 md:grid-cols-2">
                          {improvementSteps.map((step, index) => (
                            <div
                              key={`flow-step-${step.id}`}
                              className="rounded-xl border border-slate-700 bg-slate-800/80 p-4"
                            >
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                                Step {index + 1}
                              </div>
                              <div className="mt-2 text-sm font-medium text-white">
                                {step.joint || "Whole posture"}
                              </div>
                              <p className="mt-2 text-sm leading-6 text-gray-300">
                                {step.detail}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setShowFlowchart(false)}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-gray-100 transition hover:bg-slate-700"
                      >
                        Back to Tips
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleOpenVirtualCoach}
                    className="w-full flex items-center justify-center px-8 py-4 mt-4 bg-slate-700 text-gray-300 font-bold rounded-lg shadow-lg hover:scale-105 hover:bg-slate-600 transform transition-all duration-300"
                  >
                    <Bot className="w-5 h-5 mr-2" />
                    Ask Virtual Coach for Advice
                  </button>
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-300 mb-3">
                  Your Form Scan
                </h3>
                <div className="border-2 border-gray-700 rounded-lg overflow-hidden shadow-lg bg-black">
                  {result.annotated_image && (
                    <img
                      src={result.annotated_image}
                      alt="Analysis result"
                      className="w-full h-auto object-contain"
                    />
                  )}
                </div>
                <p className="mt-3 text-sm text-gray-400">
                  Red points and lines show misaligned areas. Green points and
                  lines show the joints already in the right position.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-300 mb-3">
                  Ideal Posture Image
                </h3>
                <div className="border-2 border-gray-700 rounded-lg overflow-hidden shadow-lg bg-black">
                  {idealImageVisible && idealImageSrc && (
                    <img
                      src={idealImageSrc}
                      alt="Corrected pose skeleton"
                      className="w-full h-auto object-contain"
                    />
                  )}
                  {!idealImageVisible && (
                    <div className="h-full min-h-64 flex items-center justify-center text-gray-400 px-6 py-12 text-center">
                      Generate the target posture image to compare your current
                      alignment against the corrected pose.
                    </div>
                  )}
                </div>
                <p className="mt-3 text-sm text-gray-400">
                  This ideal image shows the corrected head, shoulder, and hip
                  alignment you should compare against.
                </p>
                <button
                  onClick={handleGenerateIdealImage}
                  disabled={!canGenerateIdealImage || idealImageLoading}
                  className="w-full flex items-center justify-center px-6 py-3 mt-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-lg shadow-lg hover:scale-105 hover:shadow-emerald-500/40 transform transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {idealImageLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Ideal Image...
                    </>
                  ) : (
                    "Generate Ideal Image"
                  )}
                </button>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleTryAnother}
              className="w-full flex items-center justify-center px-8 py-4 mt-8 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 hover:shadow-cyan-500/50 transform transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Analyze Another Posture
            </button>

            <button
              onClick={saveScoreToDashboard}
              className="w-full flex items-center justify-center px-8 py-4 mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 hover:shadow-green-500/50 transform transition-all duration-300"
            >
              Save Score to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Analysis;
