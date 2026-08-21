"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface AudioRecorderProps {
  questionId: string;
  onAudioRecorded?: (
    audioUrl: string,
    transcript: string,
    duration: number,
  ) => void;
  autoStart?: boolean;
  maxDurationSeconds?: number;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  questionId,
  onAudioRecorded,
  autoStart = false,
  maxDurationSeconds = 120,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimeRef = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const isRecordingRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>("");
  const liveTranscriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptionInFlightRef = useRef(false);

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const stopLiveTranscription = () => {
    if (liveTranscriptionIntervalRef.current) {
      clearInterval(liveTranscriptionIntervalRef.current);
      liveTranscriptionIntervalRef.current = null;
    }
  };

  const stopSpeechRecognition = () => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
      recognitionRef.current = null;
    }
  };

  useEffect(() => {
    setIsRecording(false);
    isRecordingRef.current = false;
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    setAudioUrl(null);
    setIsPlaying(false);
    setPermissionError(null);
    setLiveTranscript("");
    transcriptRef.current = "";
    accumulatedTranscriptRef.current = "";
    audioChunksRef.current = [];

    stopTimer();
    stopLiveTranscription();
    stopSpeechRecognition();

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, [questionId]);

  const stopRecording = () => {
    isRecordingRef.current = false;
    stopTimer();
    stopLiveTranscription();
    stopSpeechRecognition();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    try {
      setPermissionError(null);
      setAudioUrl(null);
      setLiveTranscript("");
      transcriptRef.current = "";
      accumulatedTranscriptRef.current = "";
      transcriptionInFlightRef.current = false;
      isRecordingRef.current = true;

      if (isPlaying && audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      }
      stopTimer();
      stopLiveTranscription();
      stopSpeechRecognition();
      isRecordingRef.current = true;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const transcribeCurrentAudio = async () => {
        if (
          transcriptionInFlightRef.current ||
          audioChunksRef.current.length === 0
        ) {
          return;
        }

        transcriptionInFlightRef.current = true;
        setIsTranscribing(true);
        try {
          const audioType = mediaRecorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, {
            type: audioType,
          });
          const fileExtension =
            audioType.includes("mp4") || audioType.includes("m4a")
              ? "m4a"
              : "webm";
          const formData = new FormData();
          formData.append(
            "audio",
            audioBlob,
            `speaking-${questionId}.${fileExtension}`,
          );

          const response = await fetch("/api/ielts/transcribe", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (response.ok && data.success && data.transcript) {
            const transcript = data.transcript.trim();
            setLiveTranscript(transcript);
            transcriptRef.current = transcript;
          }
        } catch (error) {
          console.warn("[Live Transcription Warning]:", error);
        } finally {
          transcriptionInFlightRef.current = false;
          setIsTranscribing(false);
        }
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        isRecordingRef.current = false;
        stopTimer();
        stopLiveTranscription();
        stopSpeechRecognition();
        const audioType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: audioType });
        const objectUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(objectUrl);

        if (!transcriptRef.current.trim()) {
          await transcribeCurrentAudio();
        }
        const finalTranscript = transcriptRef.current.trim();

        if (onAudioRecorded) {
          onAudioRecorded(objectUrl, finalTranscript, recordingTimeRef.current);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      // Use browser STT when available; mobile browsers may require server transcription.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const WindowSpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      const initSpeechRecognition = () => {
        if (!WindowSpeechRecognition || !isRecordingRef.current) return;
        try {
          const recognition = new WindowSpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onresult = (event: any) => {
            let sessionText = "";
            for (let i = 0; i < event.results.length; i++) {
              sessionText += event.results[i][0].transcript + " ";
            }
            const fullText = (
              accumulatedTranscriptRef.current +
              " " +
              sessionText
            )
              .replace(/\s+/g, " ")
              .trim();
            setLiveTranscript(fullText);
            transcriptRef.current = fullText;
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onerror = (err: any) => {
            console.warn("[Speech Recognition Warning]:", err);
          };

          recognition.onend = () => {
            if (transcriptRef.current) {
              accumulatedTranscriptRef.current = transcriptRef.current;
            }
            if (isRecordingRef.current) {
              // Auto-restart recognition when browser stops it mid-recording
              try {
                recognition.start();
              } catch {
                initSpeechRecognition();
              }
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (sttErr) {
          console.warn("[Speech Recognition Init Error]:", sttErr);
        }
      };

      if (WindowSpeechRecognition) {
        initSpeechRecognition();
      } else {
        setPermissionError(
          "Live transcript is connecting... Keep speaking while the recording is processed.",
        );
      }

      // iOS Safari and some mobile browsers do not expose SpeechRecognition.
      // Re-transcribe the growing recording so the transcript can still update while speaking.
      if (!WindowSpeechRecognition) {
        liveTranscriptionIntervalRef.current = setInterval(() => {
          if (isRecordingRef.current) {
            void transcribeCurrentAudio();
          }
        }, 4000);
      }

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const nextTime = prev + 1;
          recordingTimeRef.current = nextTime;
          if (nextTime >= maxDurationSeconds) {
            stopRecording();
            return maxDurationSeconds;
          }
          return nextTime;
        });
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setPermissionError(
        "Microphone permission denied. Please allow microphone access in your browser.",
      );
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Status & Timer */}
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isRecording
                ? "bg-rose-100 text-rose-600 border border-rose-200 animate-pulse"
                : audioUrl
                  ? "bg-emerald-100 text-emerald-600 border border-emerald-200"
                  : "bg-purple-100 text-purple-600 border border-purple-200"
            }`}
          >
            {isRecording ? (
              <Mic className="w-6 h-6 animate-bounce" />
            ) : audioUrl ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-slate-500">
              {isRecording
                ? "Recording Speech..."
                : audioUrl
                  ? "Audio Saved"
                  : "Live Microphone"}
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 tracking-tight">
              {formatTime(recordingTime)}
              <span className="text-xs font-sans text-slate-400 font-normal ml-2">
                / {formatTime(maxDurationSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Waveform Visualizer */}
        {isRecording && (
          <div className="flex items-center gap-1 h-8 px-4 py-1 bg-slate-50 rounded-xl border border-rose-200">
            {[40, 70, 20, 90, 50, 80, 30, 100, 60, 40, 80, 50].map((h, idx) => (
              <div
                key={idx}
                className="w-1.5 bg-rose-500 rounded-full animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDuration: `${0.4 + (idx % 4) * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {!isRecording && !audioUrl && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2.5 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-md shadow-purple-200 hover:scale-[1.02]"
            >
              <Mic className="w-5 h-5" />
              <span>Start Recording</span>
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2.5 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-200 animate-pulse"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>{isTranscribing ? "Transcribing..." : "Stop & Save"}</span>
            </button>
          )}

          {audioUrl && (
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayback}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-xl transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>{isPlaying ? "Pause" : "Play Response"}</span>
              </button>

              <button
                onClick={startRecording}
                title="Re-record response"
                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all border border-slate-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Re-record</span>
              </button>

              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Real-time Speech-to-Text Live Preview */}
      {(isRecording || liveTranscript || isTranscribing) && (
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
            <span>Live Speech-to-Text Transcript</span>
          </div>
          <p className="text-sm text-slate-800 font-medium leading-relaxed italic">
            {isTranscribing
              ? "Transcribing your recording..."
              : liveTranscript ||
                "Listening... Start speaking into your microphone."}
          </p>
        </div>
      )}

      {permissionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl font-medium">
          {permissionError}
        </div>
      )}
    </div>
  );
};
