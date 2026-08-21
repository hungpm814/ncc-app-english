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

  const apiKey = process.env.AI_API_KEY;
  const endpoint = process.env.AI_ENDPOINT;
  const model = process.env.AI_MODEL || "gemini-3.7-flash-high";
  if (!apiKey || !endpoint) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Mobile transcription is not configured. Add AI_API_KEY and AI_ENDPOINT to the server environment.",
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
    const mimeType = audio.type || "audio/webm";
    const audioDataUrl = `data:${mimeType};base64,${audioBuffer.toString("base64")}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are an accurate English speech transcription service. Return only the exact spoken words. Do not add, explain, summarize, or correct the words.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcribe this English speaking-test recording. Return transcript text only.",
              },
              { type: "audio_url", audio_url: { url: audioDataUrl } },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[IELTS Transcription] AI endpoint error:", data);
      return NextResponse.json(
        { success: false, error: "Audio transcription failed." },
        { status: 502 },
      );
    }

    const transcript =
      typeof data.choices?.[0]?.message?.content === "string"
        ? data.choices[0].message.content.trim()
        : "";

    return NextResponse.json({ success: true, transcript });
  } catch (error) {
    console.error("[POST /api/ielts/transcribe] Error:", error);
    return NextResponse.json(
      { success: false, error: "Audio transcription failed." },
      { status: 500 },
    );
  }
}
