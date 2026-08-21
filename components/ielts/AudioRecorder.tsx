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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimeRef = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const isRecordingRef = useRef<boolean>(false);
  const browserFinalTranscriptRef = useRef<string>("");
  const liveTranscriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sttSocketRef = useRef<WebSocket | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const vadContextRef = useRef<AudioContext | null>(null);
  const vadFrameRef = useRef<number | null>(null);
  const speechDetectedRef = useRef(false);

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

  const stopSpeechMonitor = () => {
    if (vadFrameRef.current !== null) {
      cancelAnimationFrame(vadFrameRef.current);
      vadFrameRef.current = null;
    }
    if (vadContextRef.current) {
      void vadContextRef.current.close();
      vadContextRef.current = null;
    }
  };

  const startSpeechMonitor = (stream: MediaStream) => {
    speechDetectedRef.current = false;
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    const samples = new Uint8Array(analyser.fftSize);
    source.connect(analyser);
    vadContextRef.current = context;

    const monitor = () => {
      if (vadContextRef.current !== context) return;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / samples.length);
      if (rms > 0.02) speechDetectedRef.current = true;
      vadFrameRef.current = requestAnimationFrame(monitor);
    };

    void context.resume();
    vadFrameRef.current = requestAnimationFrame(monitor);
  };

  const stopStreamingSTT = () => {
    if (sttSocketRef.current) {
      sttSocketRef.current.close();
      sttSocketRef.current = null;
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current.onaudioprocess = null;
      audioProcessorRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
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
    browserFinalTranscriptRef.current = "";
    finalTranscriptRef.current = "";
    audioChunksRef.current = [];

    stopTimer();
    stopLiveTranscription();
    stopSpeechMonitor();
    stopStreamingSTT();
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
    stopStreamingSTT();
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
      browserFinalTranscriptRef.current = "";
      finalTranscriptRef.current = "";
      speechDetectedRef.current = false;
      isRecordingRef.current = true;

      if (isPlaying && audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      }
      stopTimer();
      stopLiveTranscription();
      stopSpeechMonitor();
      stopStreamingSTT();
      stopSpeechRecognition();
      isRecordingRef.current = true;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      startSpeechMonitor(stream);

      const connectStreamingSTT = async () => {
        const response = await fetch("/api/ielts/stt-token", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.token) {
          throw new Error(
            data.error || "Could not start streaming transcription.",
          );
        }

        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const connectionTimeout = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error("Streaming STT connection timed out."));
          }, 8000);
          const params = new URLSearchParams({
            sample_rate: "16000",
            format_turns: "true",
          });
          const socket = new WebSocket(
            `wss://streaming.assemblyai.com/v3/ws?${params.toString()}&token=${encodeURIComponent(data.token)}`,
          );
          sttSocketRef.current = socket;

          socket.onopen = () => {
            void audioContext.resume().then(() => {
              if (settled) return;
              settled = true;
              window.clearTimeout(connectionTimeout);
              resolve();
            }).catch((error) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(connectionTimeout);
              reject(error);
            });
          };
          socket.onerror = () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(connectionTimeout);
            reject(new Error("Streaming STT connection failed."));
          };
          socket.onclose = () => {
            if (isRecordingRef.current && sttSocketRef.current === socket) {
              setPermissionError(
                "Live transcription connection was interrupted.",
              );
            }
          };
          socket.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              if (message.type !== "Turn") return;
              if (!speechDetectedRef.current) return;
              const transcript = message.transcript?.trim();
              if (!transcript) return;

              if (message.end_of_turn) {
                finalTranscriptRef.current =
                  `${finalTranscriptRef.current} ${transcript}`
                    .replace(/\s+/g, " ")
                    .trim();
              }

              const displayTranscript =
                `${finalTranscriptRef.current} ${message.end_of_turn ? "" : transcript}`
                  .replace(/\s+/g, " ")
                  .trim();
              setLiveTranscript(displayTranscript);
              transcriptRef.current =
                finalTranscriptRef.current || displayTranscript;
            } catch (error) {
              console.warn("[Streaming STT Message Warning]:", error);
            }
          };

          const audioContext = new AudioContext({ sampleRate: 16000 });
          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          const silentGain = audioContext.createGain();
          silentGain.gain.value = 0;
          source.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(audioContext.destination);
          processor.onaudioprocess = (audioEvent) => {
            if (socket.readyState !== WebSocket.OPEN) return;
            const input = audioEvent.inputBuffer.getChannelData(0);
            const sourceRate = audioContext.sampleRate;
            const targetRate = 16000;
            const step = sourceRate / targetRate;
            const outputLength = Math.floor(input.length / step);
            const pcm = new Int16Array(outputLength);
            for (let index = 0; index < outputLength; index += 1) {
              const sourceIndex = Math.min(Math.floor(index * step), input.length - 1);
              const sample = Math.max(-1, Math.min(1, input[sourceIndex]));
              pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            }
            socket.send(pcm.buffer);
          };
          audioContextRef.current = audioContext;
          audioProcessorRef.current = processor;
        });
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
        stopSpeechMonitor();
        stopStreamingSTT();
        stopSpeechRecognition();
        const audioType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: audioType });
        const objectUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(objectUrl);

        const finalTranscript = speechDetectedRef.current
          ? transcriptRef.current.trim()
          : "";

        if (onAudioRecorded) {
          onAudioRecorded(objectUrl, finalTranscript, recordingTimeRef.current);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      // Use browser STT when available; AssemblyAI streaming is the mobile-capable path.
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
            if (!speechDetectedRef.current) return;
            let interimText = "";
            for (let i = 0; i < event.results.length; i++) {
              const text = event.results[i][0].transcript.trim();
              if (event.results[i].isFinal) {
                browserFinalTranscriptRef.current = `${browserFinalTranscriptRef.current} ${text}`
                  .replace(/\s+/g, " ")
                  .trim();
              } else {
                interimText = `${interimText} ${text}`
                  .replace(/\s+/g, " ")
                  .trim();
              }
            }
            const displayText = `${browserFinalTranscriptRef.current} ${interimText}`
              .replace(/\s+/g, " ")
              .trim();
            setLiveTranscript(displayText);
            transcriptRef.current = displayText;
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onerror = (err: any) => {
            console.warn("[Speech Recognition Warning]:", err);
          };

          recognition.onend = () => {
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

      let streamingStarted = false;
      try {
        // Use the server-backed stream on phones even when webkitSpeechRecognition exists.
        await connectStreamingSTT();
        streamingStarted = true;
      } catch (error) {
        console.warn("[Streaming STT Warning]:", error);
        stopStreamingSTT();
      }

      if (!streamingStarted && WindowSpeechRecognition) {
        initSpeechRecognition();
      } else if (!streamingStarted) {
        setPermissionError(
          "Live transcription is unavailable. Check the STT provider configuration.",
        );
      }
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
              <span>Stop & Save</span>
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
      {(isRecording || liveTranscript) && (
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
            <span>Live Speech-to-Text Transcript</span>
          </div>
          <p className="text-sm text-slate-800 font-medium leading-relaxed italic">
            {liveTranscript || "Listening... Start speaking into your microphone."}
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
