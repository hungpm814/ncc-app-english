import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Mobile transcription is not configured. Add ASSEMBLYAI_API_KEY to the server environment.",
      },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Audio file is required." },
        { status: 400 },
      );
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { Authorization: apiKey },
      body: audioBuffer,
    });
    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok || !uploadData.upload_url) {
      console.error(
        "[IELTS Transcription] AssemblyAI upload error:",
        uploadData,
      );
      return NextResponse.json(
        { success: false, error: "Audio upload failed." },
        { status: 502 },
      );
    }

    const transcriptResponse = await fetch(
      "https://api.assemblyai.com/v2/transcript",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: uploadData.upload_url,
          language_code: "en_us",
          speech_model: "best",
        }),
      },
    );
    const transcriptData = await transcriptResponse.json();
    if (!transcriptResponse.ok || !transcriptData.id) {
      console.error(
        "[IELTS Transcription] AssemblyAI transcript error:",
        transcriptData,
      );
      return NextResponse.json(
        { success: false, error: "Audio transcription could not start." },
        { status: 502 },
      );
    }

    const deadline = Date.now() + 50_000;
    let result = transcriptData;
    while (result.status !== "completed" && result.status !== "error") {
      if (Date.now() >= deadline) {
        return NextResponse.json(
          { success: false, error: "Audio transcription timed out." },
          { status: 504 },
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const resultResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptData.id}`,
        { headers: { Authorization: apiKey }, cache: "no-store" },
      );
      result = await resultResponse.json();
    }

    if (result.status === "error") {
      console.error(
        "[IELTS Transcription] AssemblyAI processing error:",
        result,
      );
      return NextResponse.json(
        { success: false, error: "Audio transcription failed." },
        { status: 502 },
      );
    }

    const transcript =
      typeof result.text === "string" ? result.text.trim() : "";

    return NextResponse.json({ success: true, transcript });
  } catch (error) {
    console.error("[POST /api/ielts/transcribe] Error:", error);
    return NextResponse.json(
      { success: false, error: "Audio transcription failed." },
      { status: 500 },
    );
  }
}
