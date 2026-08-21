"use client";

import React, { useEffect, useRef, useState } from "react";
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

type SttSource = "browser" | "assembly" | null;

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
  const [liveTranscript, setLiveTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const recordingTimeRef = useRef(0);

  // Browser SpeechRecognition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Transcript
  const transcriptRef = useRef("");
  const browserFinalTranscriptRef = useRef("");
  const finalTranscriptRef = useRef("");

  // Recording state
  const isRecordingRef = useRef(false);

  // Which STT is active
  const activeSttSourceRef = useRef<SttSource>(null);

  // AssemblyAI
  const sttSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // VAD - only for UI / detecting whether user spoke
  const vadContextRef = useRef<AudioContext | null>(null);
  const vadFrameRef = useRef<number | null>(null);
  const speechDetectedRef = useRef(false);

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
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

    try {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();

      analyser.fftSize = 1024;

      const samples = new Uint8Array(analyser.fftSize);

      source.connect(analyser);

      vadContextRef.current = context;

      const monitor = () => {
        if (vadContextRef.current !== context) {
          return;
        }

        analyser.getByteTimeDomainData(samples);

        let sum = 0;

        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / samples.length);

        // Mobile microphones can have lower RMS.
        if (rms > 0.008) {
          speechDetectedRef.current = true;
        }

        vadFrameRef.current = requestAnimationFrame(monitor);
      };

      void context.resume();

      vadFrameRef.current = requestAnimationFrame(monitor);
    } catch (error) {
      console.warn("[VAD] Could not initialize:", error);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }

      recognitionRef.current = null;
    }
  };

  const stopStreamingSTT = () => {
    console.log("[STT] Stopping AssemblyAI streaming");

    if (sttSocketRef.current) {
      try {
        sttSocketRef.current.close();
      } catch {
        // Ignore
      }

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

    if (activeSttSourceRef.current === "assembly") {
      activeSttSourceRef.current = null;
    }
  };

  /**
   * Browser Speech Recognition
   */
  const startBrowserSpeechRecognition = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return false;
    }

    try {
      activeSttSourceRef.current = "browser";

      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        if (!isRecordingRef.current) {
          return;
        }

        if (activeSttSourceRef.current !== "browser") {
          return;
        }

        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0]?.transcript?.trim();

          if (!text) {
            continue;
          }

          if (event.results[i].isFinal) {
            browserFinalTranscriptRef.current =
              `${browserFinalTranscriptRef.current} ${text}`
                .replace(/\s+/g, " ")
                .trim();
          } else {
            interimText = `${interimText} ${text}`.replace(/\s+/g, " ").trim();
          }
        }

        const displayText =
          `${browserFinalTranscriptRef.current} ${interimText}`
            .replace(/\s+/g, " ")
            .trim();

        if (!displayText) {
          return;
        }

        setLiveTranscript(displayText);

        transcriptRef.current = displayText;
      };

      recognition.onerror = (event: any) => {
        console.warn("[Browser STT] Error:", event?.error);
      };

      recognition.onend = () => {
        if (!isRecordingRef.current) {
          return;
        }

        if (activeSttSourceRef.current !== "browser") {
          return;
        }

        try {
          recognition.start();
        } catch {
          // Browser may already be starting
        }
      };

      recognition.start();

      recognitionRef.current = recognition;

      console.log("[Browser STT] Started");

      return true;
    } catch (error) {
      console.warn("[Browser STT] Could not start:", error);

      recognitionRef.current = null;

      return false;
    }
  };

  /**
   * AssemblyAI Streaming STT
   */
  const connectStreamingSTT = async (stream: MediaStream) => {
    console.log("[Assembly STT] Starting");

    const response = await fetch("/api/ielts/stt-token", {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();

    console.log("[Assembly STT] Token response:", {
      ok: response.ok,
      status: response.status,
      success: data.success,
      hasToken: Boolean(data.token),
    });

    if (!response.ok || !data.success || !data.token) {
      throw new Error(data.error || "Could not start streaming transcription.");
    }

    const audioContext = new AudioContext({
      sampleRate: 16000,
    });

    audioContextRef.current = audioContext;

    await audioContext.resume();

    console.log(
      "[Assembly STT] AudioContext:",
      audioContext.state,
      audioContext.sampleRate,
    );

    const params = new URLSearchParams({
      sample_rate: "16000",
      format_turns: "true",
    });

    const socket = new WebSocket(
      `wss://streaming.assemblyai.com/v3/ws?${params.toString()}&token=${encodeURIComponent(
        data.token,
      )}`,
    );

    sttSocketRef.current = socket;

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const connectionTimeout = window.setTimeout(() => {
        if (settled) return;

        settled = true;

        reject(new Error("Streaming STT connection timed out."));
      }, 10000);

      socket.onopen = () => {
        console.log("[Assembly STT] WebSocket OPEN");

        if (settled) {
          return;
        }

        settled = true;

        window.clearTimeout(connectionTimeout);

        resolve();
      };

      socket.onerror = (event) => {
        console.error("[Assembly STT] WebSocket ERROR:", event);

        if (settled) {
          return;
        }

        settled = true;

        window.clearTimeout(connectionTimeout);

        reject(new Error("Streaming STT connection failed."));
      };

      socket.onclose = (event) => {
        console.warn(
          "[Assembly STT] WebSocket CLOSED:",
          event.code,
          event.reason,
        );

        if (isRecordingRef.current && sttSocketRef.current === socket) {
          setPermissionError("Live transcription connection was interrupted.");
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          console.log("[Assembly STT] Message:", message);

          if (message.type !== "Turn") {
            return;
          }

          const transcript =
            typeof message.transcript === "string"
              ? message.transcript.trim()
              : "";

          if (!transcript) {
            return;
          }

          if (!activeSttSourceRef.current) {
            activeSttSourceRef.current = "assembly";
          }

          if (activeSttSourceRef.current !== "assembly") {
            return;
          }

          console.log(
            "[Assembly STT] Transcript:",
            transcript,
            "final:",
            message.end_of_turn,
          );

          if (message.end_of_turn) {
            finalTranscriptRef.current =
              `${finalTranscriptRef.current} ${transcript}`
                .replace(/\s+/g, " ")
                .trim();
          }

          const displayTranscript = `${finalTranscriptRef.current} ${
            message.end_of_turn ? "" : transcript
          }`
            .replace(/\s+/g, " ")
            .trim();

          setLiveTranscript(displayTranscript);

          transcriptRef.current = displayTranscript;
        } catch (error) {
          console.warn("[Assembly STT] Message parse error:", error);
        }
      };
    });

    const source = audioContext.createMediaStreamSource(stream);

    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    const silentGain = audioContext.createGain();

    silentGain.gain.value = 0;

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    audioProcessorRef.current = processor;

    let audioPacketCount = 0;

    processor.onaudioprocess = (audioEvent) => {
      if (socket.readyState !== WebSocket.OPEN || !isRecordingRef.current) {
        return;
      }

      const input = audioEvent.inputBuffer.getChannelData(0);

      const sourceRate = audioContext.sampleRate;

      const targetRate = 16000;

      const step = sourceRate / targetRate;

      const outputLength = Math.floor(input.length / step);

      const pcm = new Int16Array(outputLength);

      for (let index = 0; index < outputLength; index++) {
        const sourceIndex = Math.min(
          Math.floor(index * step),
          input.length - 1,
        );

        const sample = Math.max(-1, Math.min(1, input[sourceIndex]));

        pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }

      try {
        socket.send(pcm.buffer);

        audioPacketCount++;

        if (audioPacketCount % 20 === 0) {
          console.log("[Assembly STT] Audio packets:", audioPacketCount);
        }
      } catch (error) {
        console.warn("[Assembly STT] Failed to send audio:", error);
      }
    };

    console.log("[Assembly STT] Audio streaming started");
  };

  /**
   * Final transcription using AssemblyAI REST API.
   */
  const transcribeFinalAudio = async (audioBlob: Blob): Promise<string> => {
    try {
      const formData = new FormData();

      formData.append("audio", audioBlob, `recording-${questionId}.webm`);

      console.log("[Final STT] Sending audio for transcription");

      const response = await fetch("/api/ielts/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("[Final STT] Error:", data);

        return "";
      }

      return typeof data.transcript === "string" ? data.transcript.trim() : "";
    } catch (error) {
      console.error("[Final STT] Request failed:", error);

      return "";
    }
  };

  const stopRecording = () => {
    stopTimer();

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

      activeSttSourceRef.current = null;

      isRecordingRef.current = true;

      stopTimer();
      stopSpeechMonitor();
      stopStreamingSTT();
      stopSpeechRecognition();

      if (isPlaying && audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("[Recorder] Microphone permission granted");

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      startSpeechMonitor(stream);

      /**
       * Decide STT provider.
       *
       * Desktop:
       * Browser SpeechRecognition
       *
       * Mobile:
       * AssemblyAI Streaming
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      const browserSupported = Boolean(SpeechRecognition);

      if (browserSupported) {
        const started = startBrowserSpeechRecognition();

        if (!started) {
          activeSttSourceRef.current = "assembly";

          await connectStreamingSTT(stream);
        }
      } else {
        activeSttSourceRef.current = "assembly";

        await connectStreamingSTT(stream);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("[Recorder] MediaRecorder stopped");

        isRecordingRef.current = false;

        stopTimer();
        stopSpeechMonitor();

        const audioType = mediaRecorder.mimeType || "audio/webm";

        const audioBlob = new Blob(audioChunksRef.current, {
          type: audioType,
        });

        const objectUrl = URL.createObjectURL(audioBlob);

        setAudioUrl(objectUrl);

        /**
         * Use final AssemblyAI REST transcription
         * as the source of truth.
         */
        const finalTranscript = await transcribeFinalAudio(audioBlob);

        const fallbackTranscript = transcriptRef.current.trim();

        const transcript = finalTranscript || fallbackTranscript;

        transcriptRef.current = transcript;

        setLiveTranscript(transcript);

        stopStreamingSTT();
        stopSpeechRecognition();

        stream.getTracks().forEach((track) => track.stop());

        if (onAudioRecorded) {
          onAudioRecorded(objectUrl, transcript, recordingTimeRef.current);
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
    } catch (error) {
      console.error("[Recorder] Error:", error);

      isRecordingRef.current = false;

      stopTimer();
      stopSpeechMonitor();
      stopStreamingSTT();
      stopSpeechRecognition();

      setIsRecording(false);

      setPermissionError(
        error instanceof Error
          ? error.message
          : "Microphone permission denied. Please allow microphone access in your browser.",
      );
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current || !audioUrl) {
      return;
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);

    const secs = seconds % 60;

    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  /**
   * Cleanup when question changes / component unmounts.
   */
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;

      stopTimer();
      stopSpeechMonitor();
      stopStreamingSTT();
      stopSpeechRecognition();

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    setIsRecording(false);
    setRecordingTime(0);
    setAudioUrl(null);
    setIsPlaying(false);
    setPermissionError(null);
    setLiveTranscript("");

    recordingTimeRef.current = 0;

    transcriptRef.current = "";
    browserFinalTranscriptRef.current = "";
    finalTranscriptRef.current = "";

    audioChunksRef.current = [];

    stopTimer();
    stopSpeechMonitor();
    stopStreamingSTT();
    stopSpeechRecognition();

    isRecordingRef.current = false;
    activeSttSourceRef.current = null;

    if (autoStart) {
      const timer = window.setTimeout(() => {
        void startRecording();
      }, 100);

      return () => window.clearTimeout(timer);
    }
  }, [questionId]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
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

        {isRecording && (
          <div className="flex items-center gap-1 h-8 px-4 py-1 bg-slate-50 rounded-xl border border-rose-200">
            {[40, 70, 20, 90, 50, 80, 30, 100, 60, 40, 80, 50].map(
              (height, index) => (
                <div
                  key={index}
                  className="w-1.5 bg-rose-500 rounded-full animate-pulse"
                  style={{
                    height: `${height}%`,
                    animationDuration: `${0.4 + (index % 4) * 0.2}s`,
                  }}
                />
              ),
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {!isRecording && !audioUrl && (
            <button
              onClick={() => void startRecording()}
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
                onClick={() => void startRecording()}
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

      {(isRecording || liveTranscript) && (
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />

            <span>Live Speech-to-Text Transcript</span>
          </div>

          <p className="text-sm text-slate-800 font-medium leading-relaxed italic">
            {liveTranscript ||
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
