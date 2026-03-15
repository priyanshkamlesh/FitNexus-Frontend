import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    ShieldCheck, Activity, ChevronRight, ArrowLeft,
    User, Ruler, Info, X, CheckCircle2
} from "lucide-react";
import { API_BASE_URL } from "../config";
import { useTheme } from "../theme/ThemeProvider";

const EXAM_DATA = {
    nda: {
        name: "NDA",
        fullName: "National Defence Academy",
        criteria: { age: "16.5-19.5", height: "157cm", weight: "BMI Prop." },
        rules: {
            minAge: 16.5,
            maxAge: 19.5,
            minHeight: 157,
            bmiMin: 18.5,
            bmiMax: 24.9,
        },
        exercises: ["Running (2.4 km)", "Push-ups (Min 20)", "Chin-ups (Min 8)"],
        description: "Focuses on endurance and discipline."
    },
    "ssc-gd": {
        name: "SSC GD",
        fullName: "General Duty Staff",
        criteria: { age: "18-23", height: "170cm", weight: "Medical Std" },
        rules: {
            minAge: 18,
            maxAge: 23,
            minHeight: 170,
        },
        exercises: ["5 km Run in 24 mins", "Chest Expansion Check"],
        description: "High stamina required for 5km run."
    },
    "ssc-cpo": {
        name: "SSC CPO",
        fullName: "Central Police Organisation",
        criteria: { age: "20-25", height: "170cm", weight: "Medical Std" },
        rules: {
            minAge: 20,
            maxAge: 25,
            minHeight: 170,
        },
        exercises: ["1600m Run in 7 mins", "Push-ups (Min 15)"],
        description: "Emphasis on speed and strength."
    },
    "indian-army agniveer": {
        name: "Agniveer",
        fullName: "Indian Army Agniveer",
        criteria: { age: "17.5-21", height: "167cm", weight: "Medical Std" },
        rules: {
            minAge: 17.5,
            maxAge: 21,
            minHeight: 167,
        },
        exercises: ["1600m Run in 7 mins", "Push-ups (Min 15)"],
        description: "New entry with focus on physical fitness."
    },
    "RPF-Constable": {
        name: "RPF Constable",
        fullName: "Railway Protection Force",
        criteria: { age: "18-25", height: "170cm", weight: "Medical Std" },
        rules: {
            minAge: 18,
            maxAge: 25,
            minHeight: 170,
        },
        exercises: ["1.6 km Run in 7 mins", "Push-ups (Min 15)"],
        description: "Focus on endurance and upper body strength."
    },
    "MP-POLICE": {
        name: "State Police",
        fullName: "Madhya Pradesh Police",
        criteria: { age: "18-33", height: "168cm", weight: "Medical Std" },
        rules: {
            minAge: 18,
            maxAge: 33,
            minHeight: 168,
        },
        exercises: ["1.6 km Run in 7 mins", "Push-ups (Min 15)"],
        description: "Physical test for constable recruitment."
    }
};

const ExamDetails = ({ onExamSelected }) => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const dark = theme === "dark";
    const [selectedExam, setSelectedExam] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [profileError, setProfileError] = useState("");

    React.useEffect(() => {
        const getCurrentEmail = () => {
            try {
                const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
                if (currentUser?.email) return currentUser.email;
            } catch {}
            return localStorage.getItem("userEmail") || "";
        };

        const email = getCurrentEmail();
        if (!email) return;

        const loadProfile = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/user/profile?email=${encodeURIComponent(email)}`);
                if (!res.ok) throw new Error("Unable to load user profile.");
                const data = await res.json();
                const profile = data?.profile?.profile || data?.profile || null;
                if (profile) {
                    setUserProfile(profile);
                    setProfileError("");
                }
            } catch (err) {
                setProfileError(err.message || "Unable to load profile.");
            }
        };

        loadProfile();
    }, []);

    // Matches exercise text to your exerciseData.js keys
    const getSlug = (text) => {
        const t = text.toLowerCase();
        if (t.includes("run")) return "running";
        if (t.includes("push-up")) return "pushups";
        if (t.includes("pull up") || t.includes("chin-up")) return "pullups";
        return null;
    };

    const getEligibilityComparison = (exam) => {
        if (!exam?.rules || !userProfile) return null;

        const age = Number(userProfile.age);
        const height = Number(userProfile.height);
        const weight = Number(userProfile.weight);
        const bmi =
            height > 0 && weight > 0
                ? Number((weight / ((height / 100) * (height / 100))).toFixed(1))
                : null;
        const gender = userProfile.gender || "Not available";

        const checks = [
            {
                label: "Age",
                required: `${exam.rules.minAge} - ${exam.rules.maxAge} years`,
                actual: Number.isFinite(age) ? `${age} years` : "Not available",
                ok: Number.isFinite(age) ? age >= exam.rules.minAge && age <= exam.rules.maxAge : false,
            },
            {
                label: "Height",
                required: `${exam.rules.minHeight} cm or above`,
                actual: Number.isFinite(height) ? `${height} cm` : "Not available",
                ok: Number.isFinite(height) ? height >= exam.rules.minHeight : false,
            },
            {
                label: "Weight / BMI",
                required: exam.rules.bmiMin ? `BMI ${exam.rules.bmiMin} - ${exam.rules.bmiMax}` : exam.criteria.weight,
                actual: bmi ? `Weight ${weight} kg | BMI ${bmi}` : Number.isFinite(weight) ? `${weight} kg` : "Not available",
                ok: exam.rules.bmiMin ? !!bmi && bmi >= exam.rules.bmiMin && bmi <= exam.rules.bmiMax : Number.isFinite(weight),
            },
            {
                label: "Gender",
                required: "As per exam notification",
                actual: gender,
                ok: !!gender && gender !== "Not available",
            },
        ];

        const passed = checks.filter((item) => item.ok).length;
        return {
            checks,
            passed,
            total: checks.length,
            eligible: passed >= 3,
        };
    };

    const eligibility = selectedExam ? getEligibilityComparison(selectedExam) : null;

    return (
        <div className={`min-h-screen p-6 md:p-12 font-sans ${dark ? "bg-slate-900 text-gray-200" : "bg-slate-100 text-slate-800"}`}>
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate('/home')} className={`inline-flex items-center mb-8 rounded-full px-4 py-2 transition-colors ${dark ? "bg-slate-800/70 text-gray-400 hover:text-cyan-400" : "bg-white text-slate-500 hover:text-cyan-700 shadow-sm border border-slate-200"}`}>
                    <ArrowLeft size={20} className="mr-2" /> Back to Home
                </button>

                <div className={`relative overflow-hidden rounded-[2rem] border p-8 md:p-10 mb-8 ${dark ? "border-slate-700 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900" : "border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50 shadow-sm"}`}>
                    <div className="absolute inset-0 pointer-events-none opacity-40">
                        <div className={`absolute -top-16 -right-10 h-48 w-48 rounded-full blur-3xl ${dark ? "bg-cyan-500/20" : "bg-cyan-200"}`} />
                        <div className={`absolute -bottom-12 left-0 h-44 w-44 rounded-full blur-3xl ${dark ? "bg-blue-500/10" : "bg-blue-100"}`} />
                    </div>
                    <div className="relative">
                        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] ${dark ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border border-cyan-200"}`}>
                            <ShieldCheck size={16} />
                            Exam Selection
                        </div>
                        <h1 className={`mt-5 text-4xl md:text-5xl font-black leading-tight ${dark ? "text-white" : "text-slate-900"}`}>
                            Choose your target exam and review your readiness.
                        </h1>
                        <p className={`mt-4 max-w-3xl text-base md:text-lg ${dark ? "text-gray-400" : "text-slate-600"}`}>
                            Compare your profile with the physical requirements, check the exercise checklist,
                            and move directly into the posture scan for the exam you are preparing for.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.entries(EXAM_DATA).map(([id, exam]) => (
                        <button
                            key={id}
                            onClick={() => setSelectedExam(exam)}
                            className={`group overflow-hidden rounded-[1.75rem] border p-6 text-left transition-all duration-300 hover:-translate-y-1 ${dark ? "bg-slate-800 border-gray-700 hover:border-cyan-500 hover:shadow-2xl hover:shadow-cyan-500/10" : "bg-white border-slate-200 hover:border-cyan-500 hover:shadow-xl"}`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] ${dark ? "bg-slate-900/70 text-cyan-300 border border-slate-700" : "bg-slate-100 text-cyan-700 border border-slate-200"}`}>
                                        {exam.criteria.age} yrs
                                    </div>
                                    <h3 className={`mt-4 text-2xl font-black group-hover:text-cyan-400 ${dark ? "text-white" : "text-slate-900"}`}>{exam.name}</h3>
                                    <p className={`mt-1 text-sm ${dark ? "text-gray-500" : "text-slate-500"}`}>{exam.fullName}</p>
                                </div>
                                <div className={`rounded-full p-3 transition-all ${dark ? "bg-slate-900/70 text-gray-500 group-hover:text-cyan-400" : "bg-slate-100 text-slate-400 group-hover:text-cyan-600"}`}>
                                    <ChevronRight />
                                </div>
                            </div>

                            <p className={`mt-5 text-sm leading-6 ${dark ? "text-gray-400" : "text-slate-600"}`}>
                                {exam.description}
                            </p>

                            <div className="mt-6 grid grid-cols-3 gap-3">
                                <div className={`rounded-2xl p-3 ${dark ? "bg-slate-900/50 border border-slate-700" : "bg-slate-50 border border-slate-200"}`}>
                                    <div className={`text-[10px] uppercase tracking-[0.2em] ${dark ? "text-gray-500" : "text-slate-500"}`}>Age</div>
                                    <div className={`mt-1 text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>{exam.criteria.age}</div>
                                </div>
                                <div className={`rounded-2xl p-3 ${dark ? "bg-slate-900/50 border border-slate-700" : "bg-slate-50 border border-slate-200"}`}>
                                    <div className={`text-[10px] uppercase tracking-[0.2em] ${dark ? "text-gray-500" : "text-slate-500"}`}>Height</div>
                                    <div className={`mt-1 text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>{exam.criteria.height}</div>
                                </div>
                                <div className={`rounded-2xl p-3 ${dark ? "bg-slate-900/50 border border-slate-700" : "bg-slate-50 border border-slate-200"}`}>
                                    <div className={`text-[10px] uppercase tracking-[0.2em] ${dark ? "text-gray-500" : "text-slate-500"}`}>Fitness</div>
                                    <div className={`mt-1 text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>{exam.exercises.length} steps</div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {selectedExam && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className={`w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden relative ${dark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"}`}>
                            <div className={`p-6 md:p-8 flex justify-between items-start ${dark ? "border-b border-slate-700 bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900" : "border-b border-slate-200 bg-gradient-to-r from-white to-slate-50"}`}>
                                <div>
                                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] ${dark ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border border-cyan-200"}`}>
                                        <ShieldCheck size={14} />
                                        {selectedExam.fullName}
                                    </div>
                                    <h2 className={`mt-4 text-3xl font-black flex items-center gap-3 ${dark ? "text-white" : "text-slate-900"}`}>
                                        {selectedExam.name} Details
                                    </h2>
                                    <p className={`mt-2 max-w-2xl text-sm ${dark ? "text-gray-400" : "text-slate-600"}`}>
                                        {selectedExam.description}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedExam(null)} className={`rounded-full p-3 transition-colors ${dark ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}><X size={24} /></button>
                            </div>

                            <div className="p-6 md:p-8 max-h-[75vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    <div className={`${dark ? "bg-slate-900/50 border border-slate-700" : "bg-slate-50 border border-slate-200"} p-5 rounded-2xl`}>
                                        <User size={18} className="text-cyan-400 mb-2" />
                                        <p className={`text-xs uppercase tracking-[0.2em] ${dark ? "text-gray-400" : "text-slate-500"}`}>Age Range</p>
                                        <p className={`mt-2 text-lg font-black ${dark ? "text-white" : "text-slate-900"}`}>{selectedExam.criteria.age}</p>
                                    </div>
                                    <div className={`${dark ? "bg-slate-900/50 border border-slate-700" : "bg-slate-50 border border-slate-200"} p-5 rounded-2xl`}>
                                        <Ruler size={18} className="text-cyan-400 mb-2" />
                                        <p className={`text-xs uppercase tracking-[0.2em] ${dark ? "text-gray-400" : "text-slate-500"}`}>Height</p>
                                        <p className={`mt-2 text-lg font-black ${dark ? "text-white" : "text-slate-900"}`}>{selectedExam.criteria.height}</p>
                                    </div>
                                    <div className={`${dark ? "bg-slate-900/50 border border-slate-700" : "bg-slate-50 border border-slate-200"} p-5 rounded-2xl`}>
                                        <Activity size={18} className="text-orange-400 mb-2" />
                                        <p className={`text-xs uppercase tracking-[0.2em] ${dark ? "text-gray-400" : "text-slate-500"}`}>Preparation Items</p>
                                        <p className={`mt-2 text-lg font-black ${dark ? "text-white" : "text-slate-900"}`}>{selectedExam.exercises.length} checkpoints</p>
                                    </div>
                                </div>

                                <div className={`mb-8 rounded-[1.75rem] border p-6 ${dark ? "border-cyan-500/30 bg-slate-900/60" : "border-cyan-200 bg-cyan-50/70"}`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h3 className={`text-xl font-black flex items-center gap-2 ${dark ? "text-white" : "text-slate-900"}`}>
                                                    <Info className="text-cyan-400" size={18} />
                                                    Eligibility Comparison
                                                </h3>
                                                <p className={`mt-1 text-sm ${dark ? "text-gray-400" : "text-slate-600"}`}>
                                                    Side-by-side comparison of your saved profile and the {selectedExam.name} requirements.
                                                </p>
                                            </div>
                                            {eligibility && (
                                                <div className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                                    eligibility.eligible
                                                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                                        : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                                }`}>
                                                    {eligibility.eligible ? "Looks good" : "Needs update"}
                                                </div>
                                            )}
                                        </div>

                                        {eligibility ? (
                                            <div className="mt-4 space-y-3">
                                                <div className={`hidden md:grid grid-cols-[1.1fr_1fr_1fr_auto] gap-3 px-4 text-[11px] font-bold uppercase tracking-wider ${dark ? "text-gray-400" : "text-slate-500"}`}>
                                                    <div>Field</div>
                                                    <div>Required</div>
                                                    <div>Your profile</div>
                                                    <div>Status</div>
                                                </div>
                                                {eligibility.checks.map((check) => (
                                                    <div
                                                        key={check.label}
                                                        className={`grid grid-cols-1 gap-3 rounded-2xl p-4 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-center ${dark ? "border border-slate-700 bg-slate-800/70" : "border border-slate-200 bg-white shadow-sm"}`}
                                                    >
                                                        <div>
                                                            <div className={`text-[11px] uppercase tracking-[0.2em] md:hidden ${dark ? "text-gray-500" : "text-slate-500"}`}>Field</div>
                                                            <div className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{check.label}</div>
                                                        </div>
                                                        <div>
                                                            <div className={`text-[11px] uppercase tracking-[0.2em] md:hidden ${dark ? "text-gray-500" : "text-slate-500"}`}>Required</div>
                                                            <div className={`text-sm ${dark ? "text-cyan-200" : "text-cyan-700"}`}>{check.required}</div>
                                                        </div>
                                                        <div>
                                                            <div className={`text-[11px] uppercase tracking-[0.2em] md:hidden ${dark ? "text-gray-500" : "text-slate-500"}`}>Your Profile</div>
                                                            <div className={`text-sm ${dark ? "text-gray-300" : "text-slate-600"}`}>{check.actual}</div>
                                                        </div>
                                                        <div className={`text-sm font-bold ${
                                                            check.ok ? "text-emerald-300" : "text-rose-300"
                                                        }`}>
                                                            {check.ok ? "Match" : "Review"}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className={`flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-2xl px-4 py-4 text-sm ${dark ? "border border-slate-700 bg-slate-800/70 text-gray-300" : "border border-slate-200 bg-white text-slate-600 shadow-sm"}`}>
                                                    <div>
                                                        Matched requirements: <span className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>{eligibility.passed}/{eligibility.total}</span>
                                                    </div>
                                                    <div className={`font-bold ${eligibility.eligible ? "text-emerald-300" : "text-amber-300"}`}>
                                                        {eligibility.eligible ? "Profile mostly meets this exam" : "Profile needs improvement"}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`mt-4 rounded-2xl p-4 text-sm ${dark ? "border border-slate-700 bg-slate-800/70 text-gray-300" : "border border-slate-200 bg-white text-slate-600 shadow-sm"}`}>
                                                {profileError || "Save your age, height, weight, and gender in your profile first to see the comparison here."}
                                            </div>
                                        )}
                                    </div>

                                <div className="mb-6">
                                    <h3 className={`text-xl font-black mb-4 flex items-center gap-2 ${dark ? "text-white" : "text-slate-900"}`}><Activity className="text-orange-400" /> Preparation Checklist</h3>
                                    <div className="space-y-2">
                                        {selectedExam.exercises.map((ex, i) => {
                                            const slug = getSlug(ex);
                                            return slug ? (
                                                <Link key={i} to={`/videos/${slug}`} className={`flex justify-between items-center p-4 rounded-2xl transition-all group ${dark ? "bg-slate-900/40 border border-slate-700 hover:border-cyan-500 hover:bg-slate-700" : "bg-slate-50 border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50"}`}>
                                                    <div>
                                                        <div className={`${dark ? "text-gray-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900"}`}>{ex}</div>
                                                        <div className={`mt-1 text-xs ${dark ? "text-gray-500" : "text-slate-500"}`}>Open related exercise guide before scanning posture</div>
                                                    </div>
                                                    <span className="text-xs text-cyan-400 font-black tracking-widest opacity-0 group-hover:opacity-100 uppercase transition-all">Watch Video</span>
                                                </Link>
                                            ) : (
                                                <div key={i} className={`p-4 rounded-2xl flex items-center gap-3 ${dark ? "bg-slate-900/20 border border-slate-800 text-gray-500" : "bg-slate-50 border border-slate-200 text-slate-500"}`}><CheckCircle2 size={16} className="text-emerald-400" /> {ex}</div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className={`p-6 md:p-8 ${dark ? "bg-slate-900/50 border-t border-slate-700" : "bg-slate-50 border-t border-slate-200"}`}>
                                <button
                                    onClick={() => {
                                        if (onExamSelected) {
                                            onExamSelected(selectedExam);
                                            return;
                                        }
                                        navigate('/analysis');
                                    }}
                                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
                                >
                                    Start AI Posture Scan
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamDetails;
