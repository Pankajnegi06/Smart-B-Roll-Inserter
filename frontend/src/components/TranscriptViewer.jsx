import React from 'react';

export function TranscriptViewer({ sentences, insertions }) {
  if (!sentences || sentences.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-white/40">
        No transcript available.
      </div>
    );
  }

  // Helper to check if a sentence overlaps with insertions
  const getInsertionsForTime = (start, end) => {
    if (!insertions) return [];
    // Check if any insertion start time falls within this sentence
    // OR if the sentence falls within an insertion duration (approx 2.5s)
    return insertions.filter(ins => 
      (ins.start_sec >= start && ins.start_sec < end) || 
      (start >= ins.start_sec && start < ins.start_sec + 2.5)
    );
  };

  return (
    <div className="glass-card h-[600px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-3">
          <span className="text-2xl">📝</span> Transcript
        </h2>
        <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-white/60">
          {sentences.length} segments
        </span>
      </div>
      
      <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar flex-grow">
        {sentences.map((sent, index) => {
          const matchingInsertions = getInsertionsForTime(sent.start_sec, sent.end_sec);
          const hasMatch = matchingInsertions.length > 0;
          
          return (
            <div 
              key={index} 
              className={`p-4 rounded-xl border transition-all duration-200 ${
                hasMatch 
                  ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50 shadow-lg shadow-purple-500/5' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs text-blue-300/60 bg-blue-500/10 px-2 py-1 rounded">
                  {formatTime(sent.start_sec)} - {formatTime(sent.end_sec)}
                </span>
                {hasMatch && (
                  <div className="flex flex-col gap-1 items-end">
                    {matchingInsertions.map((ins, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/20 flex items-center gap-1">
                        <span>🎬</span> {ins.broll_id} <span className="opacity-50">({formatTime(ins.start_sec)})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className={`text-sm leading-relaxed ${hasMatch ? 'text-white font-medium' : 'text-white/70'}`}>
                {sent.text}
              </p>
              {hasMatch && (
                <div className="mt-2 space-y-2 border-t border-purple-500/10 pt-2">
                  {matchingInsertions.map((ins, i) => (
                    <div key={i} className="text-xs text-purple-200/50 italic">
                      <span className="font-bold text-purple-400/70">[{ins.broll_id}]:</span> {ins.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
