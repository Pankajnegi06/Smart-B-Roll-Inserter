import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { TranscriptViewer } from './components/TranscriptViewer';

function App() {
  const [status, setStatus] = useState(null);
  const [arolls, setArolls] = useState([]);
  const [brolls, setBrolls] = useState([]);
  const [timelines, setTimelines] = useState([]);
  const [selectedTimeline, setSelectedTimeline] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState('idle'); // idle, processing, success, error
  
  // Upload states
  const [arollFile, setArollFile] = useState(null);
  const [brollFile, setBrollFile] = useState(null);
  const [brollDescription, setBrollDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Success states
  const [lastUploadedAroll, setLastUploadedAroll] = useState(null);
  const [lastUploadedBroll, setLastUploadedBroll] = useState(null);
  const [renderStatus, setRenderStatus] = useState('idle'); // idle, processing, success, error
  const [renderedVideoPath, setRenderedVideoPath] = useState(null);
  const [jsonCopied, setJsonCopied] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statusData, arollsData, brollsData, timelinesData] = await Promise.all([
        api.getStatus(),
        api.getARolls(),
        api.getBRolls(),
        api.getTimelines()
      ]);
      
      setStatus(statusData.data);
      setArolls(arollsData.data);
      setBrolls(brollsData.data);
      setTimelines(timelinesData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleArollUpload = async () => {
    if (!arollFile) return;
    try {
      setPipelineStatus('processing');
      await api.uploadARoll(arollFile, setUploadProgress);
      setLastUploadedAroll(arollFile.name);
      setArollFile(null);
      setUploadProgress(0);
      setPipelineStatus('idle'); // Reset to idle so we don't show "Success" on the pipeline button
      fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setLastUploadedAroll(null), 3000);
    } catch (error) {
      console.error("Upload error:", error);
      setPipelineStatus('error');
    }
  };

  const handleBrollUpload = async () => {
    if (!brollFile) return; // Description is optional now
    try {
      setPipelineStatus('processing');
      await api.uploadBRoll(brollFile, brollDescription, setUploadProgress);
      setLastUploadedBroll(brollFile.name);
      setBrollFile(null);
      setBrollDescription('');
      setUploadProgress(0);
      setPipelineStatus('idle');
      fetchData();

      // Clear success message after 3 seconds
      setTimeout(() => setLastUploadedBroll(null), 3000);
    } catch (error) {
      console.error("Upload error:", error);
      setPipelineStatus('error');
    }
  };

  const runPipeline = async () => {
    try {
      setPipelineStatus('processing');
      
      await api.runFullPipeline();
      setPipelineStatus('success');
      
      // Fetch updated data
      const [arollsData, brollsData, timelinesData] = await Promise.all([
        api.getARolls(),
        api.getBRolls(),
        api.getTimelines()
      ]);
      
      setArolls(arollsData.data);
      setBrolls(brollsData.data);
      setTimelines(timelinesData.data);
      
      // Auto-select the newest timeline (last in the array, or by updatedAt)
      if (timelinesData.data && timelinesData.data.length > 0) {
        // Sort by updatedAt descending to get the newest timeline
        const sortedTimelines = [...timelinesData.data].sort((a, b) => 
          new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        );
        setSelectedTimeline(sortedTimelines[0]);
      }
    } catch (error) {
      console.error("Pipeline error:", error);
      setPipelineStatus('error');
    }
  };

  const handleRender = async () => {
    if (!selectedTimeline) return;
    try {
      setRenderStatus('processing');
      const result = await api.renderVideo(selectedTimeline.aroll_id);
      setRenderedVideoPath(result.data.outputPath);
      setRenderStatus('success');
    } catch (error) {
      console.error("Render error:", error);
      setRenderStatus('error');
    }
  };

  const handleClearData = async () => {
    if (!window.confirm("Are you sure you want to delete ALL data? This cannot be undone.")) return;
    try {
      await api.clearData();
      fetchData();
      setArollFile(null);
      setBrollFile(null);
      setSelectedTimeline(null);
      setLastUploadedAroll(null);
      setLastUploadedBroll(null);
      setRenderedVideoPath(null);
      setPipelineStatus('idle');
      setRenderStatus('idle');
    } catch (error) {
      console.error("Clear error:", error);
    }
  };

  const isPipelineReady = arolls.length > 0 && brolls.length > 0;

  const selectedARoll = selectedTimeline 
    ? arolls.find(a => a.aroll_id === selectedTimeline.aroll_id)
    : null;

  return (
    <div className="min-h-screen text-white p-8">
      {/* Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="glass rounded-2xl p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Smart B-Roll Inserter
              </h1>
              <p className="text-white/60 text-sm">AI-Powered Semantic Video Editing</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
            <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className="text-sm font-medium">{status ? 'System Online' : 'Connecting...'}</span>
          </div>
          
          <button 
            onClick={handleClearData}
            className="ml-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg border border-red-500/20 text-sm transition-colors"
          >
            🗑️ Clear All Data
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="A-Rolls" value={arolls.length} icon="📹" color="blue" />
          <StatCard title="B-Rolls" value={brolls.length} icon="🎬" color="purple" />
          <StatCard title="Timelines" value={timelines.length} icon="📊" color="emerald" />
          <StatCard 
            title="Pipeline" 
            value={isPipelineReady ? 'Ready' : 'Waiting'} 
            icon="⚡" 
            color={isPipelineReady ? 'green' : 'amber'} 
          />
        </div>

        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* A-Roll Upload */}
          <div className="glass-card space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">📹</div>
                <h2 className="text-xl font-semibold">Upload A-Roll</h2>
              </div>
              {arolls.length > 0 && (
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/20">
                  {arolls.length} uploaded
                </span>
              )}
            </div>
            
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all relative group ${arollFile ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-blue-500/50'}`}>
              <input 
                type="file" 
                accept="video/*,audio/*"
                onChange={(e) => setArollFile(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="space-y-2 pointer-events-none">
                <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  {arollFile ? (
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                </div>
                <p className="text-white/80 font-medium truncate px-4">
                  {arollFile ? arollFile.name : "Drop video here or click to browse"}
                </p>
                {!arollFile && <p className="text-xs text-white/40">MP4, MOV, WAV supported</p>}
              </div>
            </div>

            {arollFile && (
              <button 
                onClick={handleArollUpload}
                disabled={pipelineStatus === 'processing'}
                className="w-full glass-btn animate-in fade-in slide-in-from-bottom-2"
              >
                {pipelineStatus === 'processing' ? 'Uploading...' : 'Confirm & Upload A-Roll'}
              </button>
            )}

            {lastUploadedAroll && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl animate-in fade-in">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Upload Complete!</h3>
                  <p className="text-sm text-white/70">{lastUploadedAroll}</p>
                </div>
              </div>
            )}
          </div>

          {/* B-Roll Upload */}
          <div className="glass-card space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">🎬</div>
                <h2 className="text-xl font-semibold">Upload B-Roll</h2>
              </div>
              {brolls.length > 0 && (
                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/20">
                  {brolls.length} in library
                </span>
              )}
            </div>

            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all relative group ${brollFile ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-purple-500/50'}`}>
              <input 
                type="file" 
                accept="video/*"
                onChange={(e) => setBrollFile(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="space-y-2 pointer-events-none">
                <p className="text-white/80 font-medium truncate px-4">
                  {brollFile ? brollFile.name : "Select B-Roll Clip"}
                </p>
                {!brollFile && <p className="text-xs text-white/40">Add multiple clips to build your library</p>}
              </div>
            </div>

            <textarea
              placeholder="Describe the clip (optional - AI will auto-generate if empty)..."
              value={brollDescription}
              onChange={(e) => setBrollDescription(e.target.value)}
              className="w-full glass-input h-24 resize-none"
            />
            <p className="text-xs text-white/40 mt-2 px-1">
              ℹ️ Tip: Providing a detailed description manually will result in better semantic matching accuracy than auto-generation.
            </p>

            {brollFile && (
              <button 
                onClick={handleBrollUpload}
                disabled={pipelineStatus === 'processing'}
                className="w-full glass-btn bg-purple-600/80 hover:bg-purple-600 hover:shadow-purple-500/20 animate-in fade-in slide-in-from-bottom-2"
              >
                {pipelineStatus === 'processing' ? 'Uploading...' : 'Add to B-Roll Library'}
              </button>
            )}

            {lastUploadedBroll && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl animate-in fade-in">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Added to Library!</h3>
                  <p className="text-sm text-white/70">{lastUploadedBroll}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Control */}
        <div className="glass-card text-center space-y-6 py-12">
          <h2 className="text-2xl font-bold">⚡ Pipeline Control</h2>
          <p className="text-white/60 max-w-lg mx-auto">
            {isPipelineReady 
              ? "Ready to process! The system will transcribe A-rolls, segment them, generate embeddings, and match B-rolls semantically."
              : "Please upload at least one A-Roll and one B-Roll to enable the pipeline."}
          </p>
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={runPipeline}
              disabled={!isPipelineReady || pipelineStatus === 'processing'}
              className={`glass-btn text-lg px-8 py-3 flex items-center gap-3 ${
                !isPipelineReady ? 'opacity-50 cursor-not-allowed bg-gray-600/50 hover:bg-gray-600/50 shadow-none' : ''
              }`}
            >
              {pipelineStatus === 'processing' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Full Pipeline
                </>
              )}
            </button>
          </div>
        </div>

        {/* Timeline & Transcript Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline Viewer */}
          <div className="glass-card space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <span className="text-2xl">📊</span> Timeline Viewer
              </h2>
              <select 
                className="glass-input min-w-[200px]"
                value={selectedTimeline?.aroll_id || ''}
                onChange={(e) => {
                  const tl = timelines.find(t => t.aroll_id === e.target.value);
                  setSelectedTimeline(tl || null);
                }}
              >
                <option value="">Select Timeline...</option>
                {timelines.map(tl => (
                  <option key={tl.aroll_id} value={tl.aroll_id}>
                    {tl.aroll_id} ({tl.insertions.length} insertions)
                  </option>
                ))}
              </select>
            </div>

            {selectedTimeline ? (
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex justify-between text-sm text-white/60 mb-4">
                    <div className="flex gap-4">
                      <span>Duration: {selectedTimeline.aroll_duration_sec}s</span>
                      <span>Insertions: {selectedTimeline.insertions.length}</span>
                    </div>
                    {selectedTimeline.updatedAt && (
                      <span className="text-white/40">
                        Updated: {new Date(selectedTimeline.updatedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {selectedTimeline.insertions.map((ins, i) => (
                      <div key={i} className="flex gap-4 p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex-shrink-0 w-24 text-center p-2 bg-blue-500/10 rounded border border-blue-500/20">
                          <div className="text-lg font-bold text-blue-400">{ins.start_sec}s</div>
                          <div className="text-xs text-blue-300/60">Start Time</div>
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-purple-300">{ins.broll_id}</span>
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-full border border-green-500/20">
                              {(ins.confidence * 100).toFixed(0)}% Match
                            </span>
                          </div>
                          <p className="text-sm text-white/70">{ins.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>


              </div>
            ) : (
              <div className="text-center py-12 text-white/40">
                Select a timeline to view insertions
              </div>
            )}
          </div>

          {/* Transcript Viewer */}
          {selectedTimeline && selectedARoll ? (
            <TranscriptViewer 
              sentences={selectedARoll.sentences} 
              insertions={selectedTimeline.insertions} 
            />
          ) : (
            <div className="glass-card flex items-center justify-center text-white/40">
              Select a timeline to view transcript
            </div>
          )}
        </div>

        {/* Export & Details Section */}
        {selectedTimeline && (
          <div className="glass-card space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg">🚀</div>
              <h2 className="text-xl font-semibold">Export & Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* JSON Data */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white/80">Timeline Data</h3>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(JSON.stringify(selectedTimeline, null, 2));
                      setJsonCopied(true);
                      setTimeout(() => setJsonCopied(false), 2000);
                    }}
                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg border border-blue-500/20 text-xs transition-colors"
                  >
                    {jsonCopied ? 'Copied!' : 'Copy JSON'}
                  </button>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5 h-64 overflow-y-auto custom-scrollbar font-mono text-xs">
                  <code className="text-green-400 whitespace-pre-wrap">
                    {JSON.stringify(selectedTimeline, null, 2)}
                  </code>
                </div>
              </div>

              {/* Render Controls */}
              <div className="space-y-6 flex flex-col justify-center">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium text-white/80">Render Final Video</h3>
                  <p className="text-sm text-white/50">
                    Combine A-Roll and B-Rolls into a single video file based on the generated timeline.
                  </p>
                </div>

                <button 
                  onClick={handleRender}
                  disabled={renderStatus === 'processing'}
                  className="w-full glass-btn bg-emerald-600/80 hover:bg-emerald-600 hover:shadow-emerald-500/20 px-8 py-4 flex items-center justify-center gap-3 text-lg font-semibold"
                >
                  {renderStatus === 'processing' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Rendering Video...
                    </>
                  ) : (
                    <>
                      <span>🎬</span> Start Rendering
                    </>
                  )}
                </button>

                {renderStatus === 'success' && renderedVideoPath && (
                  <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl animate-in fade-in space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-green-300">Render Complete!</h4>
                      <a
                        href={`http://localhost:8080/${renderedVideoPath.replace(/\\/g, '/')}`}
                        download
                        className="text-xs bg-green-600 px-3 py-1.5 rounded-lg text-white hover:bg-green-700 font-medium"
                      >
                        Download MP4
                      </a>
                    </div>
                    <video 
                      src={`http://localhost:8080/${renderedVideoPath.replace(/\\/g, '/')}`}
                      controls
                      className="w-full rounded-lg border border-white/10 shadow-lg"
                    />
                  </div>
                )}
                
                {renderStatus === 'error' && (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl animate-in fade-in text-center">
                    <h4 className="font-bold text-red-300 mb-1">❌ Render Failed</h4>
                    <p className="text-sm text-white/70">Please check the backend console for error details.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    green: 'bg-green-500/20 text-green-400',
    amber: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div className="glass-card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-white/60">{title}</div>
      </div>
    </div>
  );
}

export default App;
