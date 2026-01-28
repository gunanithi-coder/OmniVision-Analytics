import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";

// 1. EXTRACT YOUR URL: Copy the address from your Port 8000 (without https://)
const BACKEND_DOMAIN = "fictional-space-computing-machine-pjp7gxq99rjv3rq9-8000.app.github.dev";

function App() {
  const webcamRef = useRef(null);
  const [detections, setDetections] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    // 2. USE WSS: Codespaces requires secure WebSockets
    ws.current = new WebSocket(`wss://${BACKEND_DOMAIN}/ws`);

    ws.current.onopen = () => {
      console.log("Connected to AI Backend");
      setIsConnected(true);
    };
    
    ws.current.onclose = () => setIsConnected(false);
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setDetections(data.detections);
    };
    
    const sendFrame = () => {
      if (webcamRef.current && ws.current.readyState === WebSocket.OPEN) {
        const frame = webcamRef.current.getScreenshot();
        if (frame) ws.current.send(frame);
      }
    };

    const interval = setInterval(sendFrame, 150); 
    return () => {
      clearInterval(interval);
      if (ws.current) ws.current.close();
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0f172a', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px' }}>
      <h1>OmniVision Analytics</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: isConnected ? '#22c55e' : '#ef4444' }}></div>
        <span>{isConnected ? "AI System Live" : "Connecting to Edge Backend..."}</span>
      </div>

      <div style={{ position: "relative", width: 640, height: 480 }}>
        <Webcam ref={webcamRef} screenshotFormat="image/jpeg" width={640} height={480} style={{ borderRadius: '12px' }} />
        
        <svg style={{ position: "absolute", top: 0, left: 0, zIndex: 10 }} width="640" height="480">
          {detections.map((d, i) => (
            <g key={i}>
              <rect x={d.bbox[0]} y={d.bbox[1]} width={d.bbox[2] - d.bbox[0]} height={d.bbox[3] - d.bbox[1]} fill="none" stroke="#22c55e" strokeWidth="3" />
              <text x={d.bbox[0]} y={d.bbox[1] - 10} fill="#22c55e" fontSize="16" fontWeight="bold">{d.label.toUpperCase()}</text>
            </g>
          ))}
        </svg>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
         <h3>🔥 Live Spatial Heatmap</h3>
         {/* 3. USE HTTPS: Fixed the URL for the heatmap image */}
         <img 
            src={`https://${BACKEND_DOMAIN}/heatmap?t=${Date.now()}`} 
            alt="Heatmap" 
            style={{ width: 400, borderRadius: '8px', border: '2px solid #334155' }} 
         />
      </div>
    </div>
  );
}

export default App;