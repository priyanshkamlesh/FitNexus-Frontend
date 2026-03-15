import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Lightbulb, Video } from 'lucide-react';
import { EXERCISE_CONTENT } from '../data/exerciseData';

const getSlug = (text = '') => {
  const normalized = text.toLowerCase();
  if (normalized.includes('run')) return 'running';
  if (normalized.includes('push-up') || normalized.includes('push up')) return 'pushups';
  if (
    normalized.includes('pull up') ||
    normalized.includes('pull-up') ||
    normalized.includes('chin-up') ||
    normalized.includes('chin up')
  ) {
    return 'pullups';
  }
  if (normalized.includes('long jump')) return 'longjump';
  if (normalized.includes('shot put')) return 'shotput';
  return null;
};

const ExerciseVideos = ({ exam, onContinue, onBack }) => {
  const { exerciseType } = useParams();
  const navigate = useNavigate();
  const data = EXERCISE_CONTENT[exerciseType];

  if (exam) {
    const exercises = exam.exercises
      .map((label) => ({
        label,
        slug: getSlug(label),
      }))
      .filter((item) => item.slug && EXERCISE_CONTENT[item.slug]);

    return (
      <div className="min-h-screen bg-slate-900 text-gray-200 p-6 md:p-12 font-sans">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => (onBack ? onBack() : navigate(-1))}
            className="flex items-center text-gray-400 mb-8 hover:text-cyan-400 transition-colors group"
          >
            <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back
          </button>

          <header className="mb-10">
            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2 uppercase tracking-widest">
              <Video size={20} /> {exam.name} Preparation
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white">Watch exercise guidance before posture scan</h1>
            <p className="text-gray-400 mt-2 text-lg">
              Open the relevant exercise videos, then continue to upload your posture image or video.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {exercises.map((item) => (
              <button
                key={`${exam.name}-${item.slug}-${item.label}`}
                onClick={() => navigate(`/videos/${item.slug}`)}
                className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-left transition-all hover:border-cyan-500 hover:bg-slate-800/80"
              >
                <div className="text-sm uppercase tracking-widest text-cyan-400">Exercise</div>
                <div className="mt-2 text-xl font-bold text-white">{item.label}</div>
                <div className="mt-3 text-sm text-gray-400">Open tutorial videos and tips</div>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => onContinue?.()}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white transition-all hover:opacity-90"
            >
              Continue to Posture Scan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Category Not Found</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-400 mb-8 hover:text-cyan-400 transition-colors group">
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform"/> Back
        </button>
        
        <header className="mb-12">
          <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2 uppercase tracking-widest"><Video size={20}/> Expert Tutorials</div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">{data.title}</h1>
          <p className="text-gray-400 mt-2 text-lg">{data.description}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {data.videos.map((v) => (
            <div key={v.id} className="bg-slate-800 rounded-2xl overflow-hidden border border-gray-700 group hover:border-cyan-500 transition-all shadow-xl">
              <div className="relative aspect-video">
                <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-all" alt=""/>
                <a href={v.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <Play size={44} className="text-cyan-400 fill-current"/>
                </a>
              </div>
              <div className="p-5">
                <div className="flex gap-2 mb-3">
                  {v.tags.map(tag => <span key={tag} className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-700 text-cyan-400 border border-cyan-400/20">{tag}</span>)}
                </div>
                <h3 className="font-bold text-white text-lg leading-tight group-hover:text-cyan-400 transition-colors">{v.title}</h3>
                <p className="text-gray-500 text-sm mt-2">{v.channel}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-800/40 p-8 rounded-3xl border border-slate-700 shadow-2xl">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6"><Lightbulb className="text-yellow-400"/> How to Ace This Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.tips.map((tip, i) => (
              <div key={i} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-gray-300 flex gap-3">
                <span className="text-cyan-500 font-bold">•</span> {tip}
              </div>
            ))}
          </div>
        </div>
      </div> 
    </div>
  );
};

export default ExerciseVideos;
