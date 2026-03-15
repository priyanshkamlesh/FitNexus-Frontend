import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertOctagon,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { useAuthGuard } from "../hooks/useAuthguard";

const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || "http://localhost:5001";

mermaid.initialize({
  startOnLoad: true,
  theme: "dark",
});

const YOGA_POSES = [
  "Tadasana (Mountain Pose)",
  "Vrikshasana (Tree Pose)",
  "Adho Mukha Svanasana (Downward Dog)",
  "Bhujangasana (Cobra Pose)",
  "Balasana (Child's Pose)",
  "Trikonasana (Triangle Pose)",
];

const GENERAL_FITNESS_EXERCISES = [
  {
    label: "Push-up",
    value: "pushup",
    classifier: "pushups",
    description: "Chest, triceps, and shoulder control.",
  },
  {
    label: "Pull-up",
    value: "pullup",
    classifier: "pullups",
    description: "Upper-body pulling strength and form.",
  },
  {
    label: "Sit-up",
    value: "situp",
    classifier: "situp",
    description: "Core-driven bending movement.",
  },
  {
    label: "Jumping Jack",
    value: "jumping_jack",
    classifier: "jumping_jacks",
    description: "Full-body rhythm and coordination.",
  },
  {
    label: "Squat",
    value: "squat",
    classifier: "squats",
    description: "Lower-body strength and depth control.",
  },
];

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

const extractFrameFromVideo = (videoFile) =>
  new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;
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
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error("Could not extract a frame from this video."));
              return;
            }
            resolve(new File([blob], "video_frame.jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.92
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to capture a usable frame from the video."));
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load the uploaded video."));
    };

    video.load();
  });

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
    .map((line, index) => ({
      id: `tip-${index}`,
      title: `Step ${index + 1}`,
      detail: line.replace(/^(\d+[\).\s-]+|[-•]\s*)/, "").trim(),
      joint: formatJointLabel(line),
    }));

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

const formatDetectedExercise = (exercise = "") =>
  exercise
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getSelectedActivity = (mode, selectedPose, selectedExercise) => {
  if (mode === "yoga") {
    return `Yoga pose: ${selectedPose}`;
  }
  const exercise = GENERAL_FITNESS_EXERCISES.find((item) => item.value === selectedExercise);
  return exercise ? `General fitness: ${exercise.label}` : "General fitness posture";
};

const normalizeAnalysisResult = (data) => ({
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
});

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
        <a href="/home" className="text-gray-300 hover:text-cyan-400 transition-colors">
          Home
        </a>
        <a href="/analysis" className="text-gray-300 hover:text-cyan-400 transition-colors">
          Analysis
        </a>
        <a href="/yoga" className="text-cyan-400 font-semibold border-b border-cyan-400">
          Yoga
        </a>
        <a href="/dashboard" className="text-gray-300 hover:text-cyan-400 transition-colors">
          Dashboard
        </a>
        <a href="/profile" className="text-gray-300 hover:text-cyan-400 transition-colors">
          Profile
        </a>
      </div>
    </div>
  </nav>
);

const CircularProgress = ({ score }) => {
  const [progress, setProgress] = useState(0);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setProgress(score || 0), 100);
    return () => clearTimeout(timer);
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

export default function Yoga() {
  useAuthGuard();

  const navigate = useNavigate();
  const [mode, setMode] = useState("");
  const [selectedPose, setSelectedPose] = useState(YOGA_POSES[0]);
  const [selectedExercise, setSelectedExercise] = useState(GENERAL_FITNESS_EXERCISES[0].value);
  const [uploadType, setUploadType] = useState("image");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file selected");
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [aiTips, setAiTips] = useState("");
  const [tipsError, setTipsError] = useState("");
  const [showFlowchart, setShowFlowchart] = useState(false);
  const [idealImageVisible, setIdealImageVisible] = useState(false);
  const [idealImageSrc, setIdealImageSrc] = useState("");
  const [idealImageLoading, setIdealImageLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classification, setClassification] = useState(null);
  const [datasetNotice, setDatasetNotice] = useState("");
  const [showScoreSavedPopup, setShowScoreSavedPopup] = useState(false);

  const fileInputRef = useRef(null);

  const selectedExerciseConfig = GENERAL_FITNESS_EXERCISES.find(
    (item) => item.value === selectedExercise
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const jointStatusEntries = Object.entries(result?.joint_status || {});
  const incorrectJointEntries = jointStatusEntries.filter(([, status]) => status === "incorrect");
  const correctJointEntries = jointStatusEntries.filter(([, status]) => status === "correct");
  const isPerfectAlignment =
    jointStatusEntries.length > 0 && incorrectJointEntries.length === 0;
  const effectivePostureScore =
    result && typeof result.posture_score === "number"
      ? isPerfectAlignment
        ? 100
        : result.posture_score
      : null;
  const feedbackItems = isPerfectAlignment ? [] : Array.isArray(result?.feedback) ? result.feedback : [];
  const improvementSteps = extractImprovementSteps(aiTips, feedbackItems);
  const canGenerateIdealImage = Boolean(result?.corrected_skeleton_image);

  const resetAnalysisState = () => {
    setResult(null);
    setAiTips("");
    setTipsError("");
    setShowFlowchart(false);
    setIdealImageVisible(false);
    setIdealImageSrc("");
    setIdealImageLoading(false);
    setClassification(null);
    setDatasetNotice("");
  };

  const handleModeSelect = (nextMode) => {
    setMode(nextMode);
    setError("");
    resetAnalysisState();
    setFile(null);
    setFileName("No file selected");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File is too large. Please upload a file under 50 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(selectedFile);

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setPreviewUrl(objectUrl);
    setError("");
    resetAnalysisState();
  };

  const validateSelectedExercise = async (frameFile) => {
    if (mode !== "fitness" || !selectedExerciseConfig?.classifier) {
      if (mode === "fitness" && !selectedExerciseConfig?.classifier) {
        setDatasetNotice(
          "Plank is available, but the current dataset does not include plank samples yet, so mismatch checking is skipped for this exercise."
        );
      } else {
        setDatasetNotice("");
      }
      return null;
    }

    const formData = new FormData();
    formData.append("file", frameFile, frameFile.name);

    const candidateEndpoints = [
      `${API_BASE_URL}/classify_exercise_frame`,
      `${API_BASE_URL}/api/classify_exercise_frame`,
    ];

    let res = null;
    let data = {};
    let notFoundCount = 0;

    for (const endpoint of candidateEndpoints) {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (response.status === 404) {
        notFoundCount += 1;
        continue;
      }

      res = response;
      data = await response.json().catch(() => ({}));
      break;
    }

    if (!res && notFoundCount === candidateEndpoints.length) {
      throw new Error(
        "Exercise matching is not available right now. Please restart the backend server so the classifier route can load."
      );
    }

    if (!res?.ok || data.error) {
      throw new Error(data.error || "Failed to recognize the exercise in the upload.");
    }

    const detectedExercise = data.exercise || "";
    const confidence = Number(data.confidence || 0);

    if (detectedExercise !== selectedExerciseConfig.classifier) {
      throw new Error(
        `You selected ${selectedExerciseConfig.label}, but the uploaded posture looks like ${formatDetectedExercise(
          detectedExercise
        )}. Please upload the correct exercise.`
      );
    }

    if (confidence < 0.15) {
      throw new Error(
        `The uploaded ${selectedExerciseConfig.label.toLowerCase()} is not clear enough to verify. Please use a clearer front or side view.`
      );
    }

    setDatasetNotice("");
    return data;
  };

  const handleAnalyze = async () => {
    if (!mode) {
      setError("Choose Yoga or General Fitness first.");
      return;
    }

    if (!file) {
      setError(`Please upload ${uploadType === "video" ? "a video" : "an image"} first.`);
      return;
    }

    setLoading(true);
    setError("");
    resetAnalysisState();

    try {
      const frameFile = uploadType === "video" ? await extractFrameFromVideo(file) : file;
      const exerciseCheck = await validateSelectedExercise(frameFile);
      if (exerciseCheck) {
        setClassification(exerciseCheck);
      }

      const formData = new FormData();
      formData.append("file", frameFile, frameFile.name);
      if (mode === "fitness" && selectedExerciseConfig?.classifier) {
        formData.append("expected_exercise", selectedExerciseConfig.classifier);
        if (exerciseCheck?.phase) {
          formData.append("expected_phase", exerciseCheck.phase);
        }
      }

      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to analyze posture.");
      }

      setResult(normalizeAnalysisResult(data));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to analyze this upload.");
    } finally {
      setLoading(false);
    }
  };

  const generateAiTips = async () => {
    if (!result) return;
    if (isPerfectAlignment) {
      setAiTips("");
      setTipsError("");
      setShowFlowchart(false);
      return;
    }

    setTipsLoading(true);
    setTipsError("");
    setAiTips("");
    setShowFlowchart(false);

    try {
      const res = await fetch(`${API_BASE_URL}/generate_tips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity: getSelectedActivity(mode, selectedPose, selectedExercise),
          posture_data: {
            score: effectivePostureScore,
            feedback: feedbackItems,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate improvement tips.");
      }

      const tips = (data?.tips || "").replace(/\*/g, "").trim();
      if (!tips) {
        throw new Error("Tips response was empty.");
      }
      setAiTips(tips);
    } catch (err) {
      setTipsError(err.message || "Failed to generate tips. Please try again.");
    } finally {
      setTipsLoading(false);
    }
  };

  const generateFlowchart = (steps) => {
    if (!result || !steps.length) return "";

    const cleanLabel = (text) =>
      text
        .replace(/[*#]/g, "")
        .replace(/[()]/g, "")
        .replace(/["']/g, "")
        .replace(/[:;]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, " ")
        .trim();

    const shorten = (text) => {
      const words = text.split(" ");
      return words.slice(0, 6).join(" ") + (words.length > 6 ? "..." : "");
    };

    const issueCount = incorrectJointEntries.length;
    let chart = "flowchart TD\n";
    chart += `Start["Current Posture Score: ${Math.round(effectivePostureScore || 0)}%"]\n`;
    chart += `Assess["Detected ${issueCount} alignment issue${issueCount === 1 ? "" : "s"}"]\n`;
    chart += "Start --> Assess\n";

    let previousNode = "Assess";
    steps.forEach((step, index) => {
      const node = `Step${index}`;
      const focus = step.joint ? `${step.joint}: ` : "";
      const label = shorten(cleanLabel(`${focus}${step.detail}`));
      chart += `${node}["${index + 1}. ${label}"]\n`;
      chart += `${previousNode} --> ${node}\n`;
      previousNode = node;
    });

    chart += `${previousNode} --> End["Improved posture goal"]`;
    return chart;
  };

  const flowChart = generateFlowchart(improvementSteps);

  const handleGenerateIdealImage = async () => {
    if (!result?.corrected_skeleton_image) return;
    setIdealImageLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIdealImageSrc(result.corrected_skeleton_image);
    setIdealImageVisible(true);
    setIdealImageLoading(false);
  };

  const saveScoreToDashboard = async () => {
    if (typeof effectivePostureScore !== "number") {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: effectivePostureScore,
          meta: {
            activity: getSelectedActivity(mode, selectedPose, selectedExercise),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save score.");
      }

      setShowScoreSavedPopup(true);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save score.");
    } finally {
      setSaving(false);
    }
  };

  const buildVirtualCoachContext = () => {
    if (!result) return null;

    return {
      score: Math.round(effectivePostureScore || 0),
      summary:
        isPerfectAlignment
          ? "Perfect alignment detected. No correction points were found."
          : result.summary || getSelectedActivity(mode, selectedPose, selectedExercise),
      issues: incorrectJointEntries.map(([joint]) => JOINT_LABELS[joint] || joint),
      aligned: correctJointEntries.map(([joint]) => JOINT_LABELS[joint] || joint),
      feedback: feedbackItems
        .map((item) => ({
          joint: item?.joint || "Posture",
          tip: item?.tip || "",
        }))
        .filter((item) => item.tip),
      steps: improvementSteps.map((step) => ({
        title: step.title,
        joint: step.joint,
        detail: step.detail,
      })),
      uploadType,
      activity: getSelectedActivity(mode, selectedPose, selectedExercise),
      detectedExercise: classification?.exercise || "",
      detectedPhase: classification?.phase || "",
    };
  };

  const handleOpenVirtualCoach = () => {
    const postureContext = buildVirtualCoachContext();
    navigate("/virtual_coach", {
      state: postureContext ? { postureContext } : undefined,
    });
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setFileName("No file selected");
    setPreviewUrl("");
    setError("");
    resetAnalysisState();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200 p-4 md:p-8">
      <Navbar />
      {showScoreSavedPopup && (
        <SaveScorePopup onDone={() => setShowScoreSavedPopup(false)} />
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {!mode && (
          <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-gray-700">
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-3 text-center">
              Choose Your Training Mode
            </h1>
            <p className="text-gray-400 text-center max-w-2xl mx-auto mb-8">
              Pick the kind of session you want to analyze first. Yoga keeps the pose-focused flow,
              and General Fitness checks whether the uploaded exercise matches what you selected.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => handleModeSelect("fitness")}
                className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 text-left transition-all hover:border-cyan-400 hover:shadow-cyan-500/30 shadow-md"
              >
                <div className="flex items-center gap-3 text-cyan-400 mb-3">
                  <Activity className="w-8 h-8" />
                  <span className="text-sm font-semibold uppercase tracking-[0.2em]">
                    General Fitness
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Analyze gym and bodyweight exercises</h2>
                <p className="text-gray-400">
                  Choose an exercise like push-up or pull-up, upload an image or video, and we
                  will verify the movement before posture analysis starts.
                </p>
              </button>

              <button
                onClick={() => handleModeSelect("yoga")}
                className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 text-left transition-all hover:border-cyan-400 hover:shadow-cyan-500/30 shadow-md"
              >
                <div className="flex items-center gap-3 text-cyan-400 mb-3">
                  <Sparkles className="w-8 h-8" />
                  <span className="text-sm font-semibold uppercase tracking-[0.2em]">Yoga</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Analyze yoga pose alignment</h2>
                <p className="text-gray-400">
                  Keep the yoga-specific flow, choose a pose, upload a clear image or video, and
                  get alignment feedback with improvement guidance.
                </p>
              </button>
            </div>
          </div>
        )}

        {mode && (
          <>
            <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-gray-700">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                  <button
                    onClick={() => handleModeSelect("")}
                    className="flex items-center text-sm text-gray-400 hover:text-cyan-300 mb-3"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to mode selection
                  </button>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                    {mode === "yoga" ? "Yoga Posture Analysis" : "General Fitness Posture Analysis"}
                  </h1>
                  <p className="text-gray-400 text-sm md:text-base max-w-3xl">
                    {mode === "yoga"
                      ? "Choose a yoga pose, then upload an image or a short video frame to check your alignment."
                      : "Choose the exercise first. We will confirm the upload matches that exercise before giving posture feedback."}
                  </p>
                </div>

                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-xs md:text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-semibold text-white">
                      {mode === "yoga" ? "Select Pose" : "Select Exercise"}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {(mode === "yoga" ? YOGA_POSES : GENERAL_FITNESS_EXERCISES).map((item) => {
                      const value = typeof item === "string" ? item : item.value;
                      const label = typeof item === "string" ? item : item.label;
                      const description =
                        typeof item === "string" ? "Yoga alignment check." : item.description;
                      const isActive =
                        mode === "yoga" ? selectedPose === value : selectedExercise === value;

                      return (
                        <button
                          key={value}
                          onClick={() => {
                            if (mode === "yoga") {
                              setSelectedPose(value);
                            } else {
                              setSelectedExercise(value);
                            }
                            setError("");
                            setClassification(null);
                            setDatasetNotice("");
                          }}
                          className={`w-full text-left rounded-lg border px-3 py-3 transition ${
                            isActive
                              ? "bg-cyan-500/10 border-cyan-400 text-cyan-200"
                              : "bg-slate-900/60 border-slate-700 text-gray-300 hover:bg-slate-800"
                          }`}
                        >
                          <div className="font-semibold">{label}</div>
                          <div className="mt-1 text-xs text-gray-400">{description}</div>
                        </button>
                      );
                    })}
                  </div>

                  {mode === "fitness" && !selectedExerciseConfig?.classifier && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-xs text-amber-200">
                      Plank is shown here, but your current dataset does not include plank samples yet,
                      so strict exercise mismatch detection is not available for plank.
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setUploadType("image")}
                      className={`rounded-lg border p-4 text-left transition ${
                        uploadType === "image"
                          ? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
                          : "border-slate-700 bg-slate-800/70 text-gray-300 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <ImageIcon className="w-4 h-4" />
                        Upload Image
                      </div>
                      <p className="mt-2 text-sm text-gray-400">Use a single clear frame or photo.</p>
                    </button>
                    <button
                      onClick={() => setUploadType("video")}
                      className={`rounded-lg border p-4 text-left transition ${
                        uploadType === "video"
                          ? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
                          : "border-slate-700 bg-slate-800/70 text-gray-300 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <Video className="w-4 h-4" />
                        Upload Video
                      </div>
                      <p className="mt-2 text-sm text-gray-400">We will extract one usable frame automatically.</p>
                    </button>
                  </div>

                  <label
                    htmlFor="yoga-file-input"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-cyan-400 hover:bg-slate-800/60 transition-colors"
                  >
                    <UploadCloud className="w-10 h-10 text-cyan-400 mb-3" />
                    <span className="text-sm text-gray-300 mb-1">
                      Click to select {uploadType === "video" ? "a video" : "an image"}
                    </span>
                    <span className="text-xs text-gray-500 text-center">
                      {mode === "yoga"
                        ? `Current pose: ${selectedPose}`
                        : `Current exercise: ${selectedExerciseConfig?.label || "General fitness"}`}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">{fileName}</span>
                    <input
                      ref={fileInputRef}
                      id="yoga-file-input"
                      type="file"
                      accept={uploadType === "video" ? "video/*" : "image/*"}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {previewUrl && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Preview</p>
                      {uploadType === "video" ? (
                        <video
                          src={previewUrl}
                          controls
                          className="max-h-64 rounded-lg border border-slate-700 w-full bg-black"
                        />
                      ) : (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-64 rounded-lg border border-slate-700 object-contain w-full bg-black"
                        />
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/60 border border-red-700 px-4 py-3 rounded-lg">
                      <AlertOctagon className="w-5 h-5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {datasetNotice && (
                    <div className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/40 px-4 py-3 rounded-lg">
                      {datasetNotice}
                    </div>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full flex items-center justify-center px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 hover:shadow-cyan-500/50 transform transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Posture"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {result && (
              <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-gray-700 transition-opacity duration-500 animate-fadeIn">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Analysis</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div className="flex flex-col items-center justify-center bg-slate-900/50 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-300 mb-3">Alignment Score</h3>
                    <CircularProgress score={effectivePostureScore} />
                    <p className="text-center text-gray-400 mt-4">
                      {mode === "yoga"
                        ? "Your overall yoga pose alignment."
                        : "Your overall exercise posture alignment."}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-300 mb-3">Alignment Tips</h3>
                    <p className="text-gray-300 mb-4">
                      {result.summary || getSelectedActivity(mode, selectedPose, selectedExercise)}
                    </p>

                    {classification && (
                      <div className="mb-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                        Detected exercise: <strong>{formatDetectedExercise(classification.exercise)}</strong>
                        {classification.phase ? ` (${classification.phase})` : ""}
                        {typeof classification.confidence === "number"
                          ? ` with ${(classification.confidence * 100).toFixed(0)}% confidence.`
                          : "."}
                      </div>
                    )}

                    <div className="mb-4 flex flex-wrap gap-3 text-xs">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-900/50 text-red-200 border border-red-500/50">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2" />
                        Needs correction
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-900/40 text-emerald-200 border border-emerald-500/50">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
                        Already aligned
                      </span>
                    </div>

                    {!!jointStatusEntries.length && (
                      <div className="mb-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3">
                          <div className="text-xs uppercase tracking-wide text-red-300">Needs correction</div>
                          <div className="mt-1 text-2xl font-bold text-white">{incorrectJointEntries.length}</div>
                        </div>
                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-3">
                          <div className="text-xs uppercase tracking-wide text-emerald-300">Already aligned</div>
                          <div className="mt-1 text-2xl font-bold text-white">{correctJointEntries.length}</div>
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
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                                isIncorrect
                                  ? "border-red-500/50 bg-red-900/40 text-red-100"
                                  : "border-emerald-500/50 bg-emerald-900/30 text-emerald-100"
                              }`}
                            >
                              {isIncorrect ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                              {JOINT_LABELS[joint] || joint}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {feedbackItems.length > 0 ? (
                      <ul className="space-y-4">
                        {feedbackItems.map((item, index) => (
                          <li
                            key={`${item.joint}-${index}`}
                            className="bg-slate-700 border border-gray-600 p-4 rounded-lg shadow-md transition-all duration-300 hover:shadow-red-500/20 hover:border-red-500"
                          >
                            <div className="flex items-start">
                              <Target className="w-6 h-6 text-red-500 mr-4 flex-shrink-0 mt-1" />
                              <div>
                                <h4 className="font-semibold text-white text-lg">{item.joint}</h4>
                                <p className="text-gray-300">{item.tip}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center bg-gradient-to-br from-green-600 to-emerald-700 border border-green-500 p-6 rounded-lg shadow-lg shadow-green-500/20 text-white">
                        <CheckCircle className="w-16 h-16 text-white mb-3" />
                        <h4 className="font-bold text-2xl text-center">Posture Looks Correct</h4>
                        <p className="text-green-100 text-center mt-2">
                          Your posture is correct. Keep practising in the same posture.
                        </p>
                        <p className="text-green-100 text-center mt-2">
                          If you need my help, FitNexus is always there.
                        </p>
                      </div>
                    )}

                    <div className="mt-6 space-y-3">
                      {!showFlowchart && !isPerfectAlignment && (
                        <button
                          onClick={generateAiTips}
                          disabled={tipsLoading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-gray-100 border border-gray-600 transition disabled:opacity-60"
                        >
                          <Lightbulb className="w-4 h-4 text-yellow-300" />
                          {tipsLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating AI Tips...
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

                      {!!aiTips && !showFlowchart && !isPerfectAlignment && (
                        <div className="mt-4 space-y-4">
                          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 p-5 shadow-lg shadow-cyan-500/10">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-semibold text-white">Your Improvement Plan</h3>
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
                                  <div key={step.id} className="rounded-xl border border-slate-600 bg-slate-900/70 p-4">
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
                                        <p className="mt-2 text-sm leading-6 text-gray-300">{step.detail}</p>
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
                            onClick={() => setShowFlowchart(true)}
                            className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg shadow hover:scale-105 transition"
                          >
                            Visualize Posture Correction Steps
                          </button>
                        </div>
                      )}

                      {showFlowchart && !isPerfectAlignment && (
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
                                  <p className="mt-2 text-sm leading-6 text-gray-300">{step.detail}</p>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-300 mb-3">Your Form Scan</h3>
                    <div className="border-2 border-gray-700 rounded-lg overflow-hidden shadow-lg bg-black">
                      {result.annotated_image && (
                        <img src={result.annotated_image} alt="Analysis result" className="w-full h-auto object-contain" />
                      )}
                    </div>
                    <p className="mt-3 text-sm text-gray-400">
                      Red points and lines show areas that need correction. Green points show joints
                      that are already aligned well.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-300 mb-3">Ideal Posture Image</h3>
                    <div className="border-2 border-gray-700 rounded-lg overflow-hidden shadow-lg bg-black">
                      {idealImageVisible && idealImageSrc ? (
                        <img
                          src={idealImageSrc}
                          alt="Corrected pose skeleton"
                          className="w-full h-auto object-contain"
                        />
                      ) : (
                        <div className="h-full min-h-64 flex items-center justify-center text-gray-400 px-6 py-12 text-center">
                          Generate the target posture image to compare your current alignment
                          against the corrected pose.
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-gray-400">
                      This ideal image helps you compare your current shape against a cleaner target posture.
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

                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center px-8 py-4 mt-8 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 hover:shadow-cyan-500/50 transform transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Analyze Another Upload
                </button>

                <button
                  onClick={saveScoreToDashboard}
                  disabled={saving}
                  className="w-full flex items-center justify-center px-8 py-4 mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 hover:shadow-green-500/50 transform transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Score to Dashboard
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
