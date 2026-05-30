"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface VoiceMessageProps {
  url: string;
  duration?: number;
  isOwn: boolean;
}

export function VoiceMessage({ url, duration, isOwn }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setTotalDuration(Math.round(audio.duration));
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    });

    return () => {
      audio.pause();
      audio.src = "";
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [url]);

  const updateTime = () => {
    if (audioRef.current) {
      setCurrentTime(Math.round(audioRef.current.currentTime));
      animRef.current = requestAnimationFrame(updateTime);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      animRef.current = requestAnimationFrame(updateTime);
    }
  };

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Progress percentage for the waveform
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <Button
        size="icon"
        variant="ghost"
        className={`h-8 w-8 rounded-full shrink-0 ${
          isOwn
            ? "text-green-800 hover:text-green-900 hover:bg-green-100"
            : "text-foreground hover:bg-muted"
        }`}
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>

      {/* Waveform visualization */}
      <div className="flex-1 flex items-center gap-[2px] h-6">
        {Array.from({ length: 30 }).map((_, i) => {
          const barProgress = (i / 30) * 100;
          const isPlayed = barProgress < progress;
          // Generate pseudo-random heights for visual appeal
          const height = Math.max(
            4,
            Math.sin(i * 0.5) * 8 + Math.cos(i * 0.3) * 6 + 10
          );

          return (
            <div
              key={i}
              className="w-[2px] rounded-full transition-colors duration-100"
              style={{
                height: `${height}px`,
                backgroundColor: isPlayed
                  ? isOwn
                    ? "rgba(0, 100, 0, 0.8)"
                    : "hsl(217, 91%, 60%)"
                  : isOwn
                  ? "rgba(0, 100, 0, 0.3)"
                  : "hsl(220, 9%, 60%)",
              }}
            />
          );
        })}
      </div>

      {/* Time display */}
      <span
        className={`text-[10px] font-mono min-w-[35px] text-right ${
          isOwn ? "text-green-800/70" : "text-muted-foreground"
        }`}
      >
        {isPlaying ? formatTime(currentTime) : formatTime(totalDuration)}
      </span>
    </div>
  );
}
