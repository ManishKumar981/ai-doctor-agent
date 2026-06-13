import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/shared/OpenAiModel";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputText: string = body.text;
    const targetLanguage: string = body.targetLanguage;

    if (!inputText) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const instructions: Record<string, string> = {
      hi: "Convert this to Hindi Devanagari script. Return ONLY Hindi script. Text: " + inputText,
    };

    const prompt = instructions[targetLanguage];
    if (!prompt) {
      return NextResponse.json({ translated: inputText });
    }

    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: "You are a translator. Return ONLY translated text." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const translated = response.choices[0]?.message?.content?.trim() || inputText;
    return NextResponse.json({ translated });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json({ translated: "" });
  }
}