import cv2
import numpy as np
import base64
from fastapi import FastAPI, WebSocket, Response
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI()

# Allow CORS for Codespaces networking
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("yolov8n.pt")
# Heatmap buffer (640x480 resolution)
heatmap_data = np.zeros((480, 640), dtype=np.float32)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # 1. Receive Frame
            data = await websocket.receive_text()
            encoded = data.split(",", 1)[1]
            nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            # 2. Inference
            results = model(frame, verbose=False)[0]
            detections = []
            
            for box in results.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cls = int(box.cls[0])
                
                # 3. Update Heatmap (Increment center of box)
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                if 0 <= cx < 640 and 0 <= cy < 480:
                    cv2.circle(heatmap_data, (cx, cy), 15, 1, -1) 
                
                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "label": model.names[cls],
                    "conf": float(box.conf[0])
                })

            await websocket.send_json({"detections": detections})
    except Exception as e:
        print(f"Error: {e}")

@app.get("/heatmap")
def get_heatmap():
    # Normalize and apply color map for the UI
    heatmap_norm = cv2.normalize(heatmap_data, None, 0, 255, cv2.NORM_MINMAX, cv2.CV_8U)
    heatmap_color = cv2.applyColorMap(heatmap_norm, cv2.COLORMAP_JET)
    _, buffer = cv2.imencode('.jpg', heatmap_color)
    return Response(content=buffer.tobytes(), media_type="image/jpeg")