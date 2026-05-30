"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, X } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onCancel?: () => void;
  onSend?: (blob: Blob, duration: number) => void;
  maxDuration?: number;
}

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  onSend,
  maxDuration = 300,
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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const durationRef = useRef(0);

  // Keep durationRef in sync
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const updateAnalyser = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const step = Math.floor(data.length / 20);
    const sampled = Array.from({ length: 20 }, (_, i) => data[i * step] || 0);
    setAnalyserData(sampled);
    animFrameRef.current = requestAnimationFrame(updateAnalyser);
  }, []);

  const cleanupRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRecording(false);
    setAnalyserData([]);
    mediaRecorderRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

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
        const finalDuration = durationRef.current;
        cleanupRecording();
        onRecordingComplete(blob, finalDuration);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);
      setAnalyserData([]);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            // Auto-send on max duration
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
              mediaRecorderRef.current.stop();
            }
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      animFrameRef.current = requestAnimationFrame(updateAnalyser);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [onRecordingComplete, maxDuration, updateAnalyser, cleanupRecording]);

  // Auto-start recording on mount
  useEffect(() => {
    startRecording();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const sendRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Override onstop to call onSend instead
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const finalDuration = durationRef.current;
      
      // Stop the recorder
      mediaRecorderRef.current.onstop = () => {
        cleanupRecording();
        if (onSend) {
          onSend(blob, finalDuration);
        } else {
          onRecordingComplete(blob, finalDuration);
        }
      };
      mediaRecorderRef.current.stop();
    }
  }, [onSend, onRecordingComplete, cleanupRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      chunksRef.current = [];
    }
    cleanupRecording();
    onCancel?.();
  }, [onCancel, cleanupRecording]);

  const formatDuration = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2">
      {/* Recording indicator dot */}
      <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />

      {/* Waveform visualization */}
      <div className="flex items-center gap-[2px] h-6 flex-1">
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
          Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] h-1 rounded-full bg-red-300"
            />
          ))
        )}
      </div>

      {/* Duration */}
      <span className="text-xs font-mono text-red-600 dark:text-red-400 min-w-[40px]">
        {formatDuration(duration)}
      </span>

      {/* Controls: Cancel, Stop, Send */}
      <div className="flex items-center gap-1.5">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={cancelRecording}
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700"
          onClick={stopRecording}
          title="Stop recording"
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          className="h-8 w-8 rounded-full bg-red-500 hover:bg-red-600 text-white"
          onClick={sendRecording}
          title="Send voice message"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
