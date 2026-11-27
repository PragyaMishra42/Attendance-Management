"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, RotateCcw, VideoOff } from "lucide-react";

interface CameraCaptureProps {
  onConfirmPhoto: (dataUrl: string) => void;
  initialPhoto?: string | null;
}

export function CameraCapture({ onConfirmPhoto, initialPhoto = null }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(initialPhoto);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        "Camera API is unavailable in this browser context. You can upload a classroom photo or use a sample photo instead."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Permission denied";
      setCameraError(
        `Could not access camera (${msg}). You can upload a classroom photo or use the demo classroom capture.`
      );
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedUrl(dataUrl);
    stopCamera();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCapturedUrl(reader.result);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  }

  function generateDemoClassroomPhoto() {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clean classroom-like backdrop for demo
    ctx.fillStyle = "#E2E8F0";
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(140, 40, 680, 140);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "600 22px sans-serif";
    ctx.fillText("SmartAttend Demo Classroom Capture", 280, 118);

    // Draw stylized student silhouettes at desks
    const positions = [
      { x: 180, y: 260 },
      { x: 400, y: 250 },
      { x: 630, y: 265 },
      { x: 290, y: 390 },
      { x: 560, y: 385 },
    ];
    positions.forEach((p, idx) => {
      ctx.fillStyle = idx === 4 ? "#64748B" : "#4F46E5";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#334155";
      ctx.fillRect(p.x - 45, p.y + 44, 90, 55);
    });

    setCapturedUrl(canvas.toDataURL("image/jpeg", 0.85));
    stopCamera();
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
        {capturedUrl ? (
          <img
            src={capturedUrl}
            alt="Captured classroom"
            className="max-h-[420px] w-full object-contain"
          />
        ) : cameraActive ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-h-[420px] w-full object-cover"
          />
        ) : (
          <div className="flex h-72 flex-col items-center justify-center gap-3 p-6 text-center text-slate-300">
            <div className="rounded-2xl bg-slate-800 p-4">
              {cameraError ? (
                <VideoOff className="h-8 w-8 text-amber-400" />
              ) : (
                <Camera className="h-8 w-8 text-indigo-400" />
              )}
            </div>
            <div className="max-w-md space-y-1">
              <p className="text-sm font-medium text-white">
                {cameraError ? "Camera Unavailable" : "Ready to Capture Classroom Photo"}
              </p>
              <p className="text-xs text-slate-400">
                {cameraError ||
                  "Open your device camera, upload a classroom photograph, or generate a demo classroom capture."}
              </p>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!capturedUrl && !cameraActive && (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition hover:bg-indigo-700"
            >
              <Camera className="h-4 w-4" />
              Open Camera
            </button>
          )}

          {cameraActive && (
            <button
              type="button"
              onClick={captureFrame}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition hover:bg-emerald-700"
            >
              <Camera className="h-4 w-4" />
              Capture Photo
            </button>
          )}

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <ImagePlus className="h-4 w-4" />
            <span>Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {!capturedUrl && (
            <button
              type="button"
              onClick={generateDemoClassroomPhoto}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              Use Demo Classroom Photo
            </button>
          )}
        </div>

        {capturedUrl && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCapturedUrl(null);
                startCamera();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Retake
            </button>
            <button
              type="button"
              onClick={() => onConfirmPhoto(capturedUrl)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <Check className="h-4 w-4" />
              Confirm & Run AI Assist
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
