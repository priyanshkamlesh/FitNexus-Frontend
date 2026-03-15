import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: true,
  theme: "dark",
});

export default function MermaidChart({ chart }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.contentLoaded();
    }
  }, [chart]);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="mermaid" ref={ref}>
        {chart}
      </div>
    </div>
  );
}