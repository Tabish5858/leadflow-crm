"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onCancel?: () => void;
  maxDuration?: number; // seconds
}

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 300, // 5 minutes default
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [analyserData, setAnalyserData] = useState<number[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const updateAnalyser = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    // Sample down to ~20 bars for visualization
    const step = Math.floor(data.length / 20);
    const sampled = Array.from({ length: 20 }, (_, i) => data[i * step] || 0);
    setAnalyserData(sampled);
    animFrameRef.current = requestAnimationFrame(updateAnalyser);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for waveform visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(blob, duration);
        // Cleanup
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setDuration(0);
      setAnalyserData([]);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Start waveform visualization
      animFrameRef.current = requestAnimationFrame(updateAnalyser);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [onRecordingComplete, maxDuration, duration, updateAnalyser]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setAnalyserData([]);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      chunksRef.current = []; // Discard the recording
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setAnalyserData([]);
    onCancel?.();
  }, [onCancel]);

  const formatDuration = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
      {/* Waveform visualization */}
      <div className="flex items-center gap-[2px] h-6">
        {isRecording ? (
          analyserData.map((val, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-red-500 transition-all duration-75"
              style={{
                height: `${Math.max(4, (val / 255) * 24)}px`,
              }}
            />
          ))
        ) : (
          // Static waveform when not recording
          Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] h-1 rounded-full bg-muted-foreground/30"
            />
          ))
        )}
      </div>

      {/* Duration */}
      <span className="text-xs font-mono text-muted-foreground min-w-[40px]">
        {formatDuration(duration)}
      </span>

      {/* Controls */}
      {!isRecording ? (
        <Button
          size="icon"
          className="h-8 w-8 rounded-full bg-red-500 hover:bg-red-600 text-white"
          onClick={startRecording}
        >
          <Mic className="h-4 w-4" />
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-full"
            onClick={cancelRecording}
          >
            <span className="text-xs">✕</span>
          </Button>
          <Button
            size="icon"
            className="h-8 w-8 rounded-full bg-red-500 hover:bg-red-600 text-white animate-pulse"
            onClick={stopRecording}
          >
            <Square className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
