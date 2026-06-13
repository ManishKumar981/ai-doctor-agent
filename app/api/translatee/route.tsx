import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/shared/OpenAiModel";

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const instructions: Record<string, string> = {
      hi: `Convert the following romanized Hindi or English text to proper Hindi Devanagari script. 
Return ONLY the Hindi text in Devanagari script. No explanation, no English, just Hindi script.
Text: "${text}"`,
    };

    const prompt = instructions[targetLanguage];
    if (!prompt) {
      return NextResponse.json({ translated: text });
    }

    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a language translator. Return ONLY the translated text in the requested script. Nothing else."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const translated = response.choices[0]?.message?.content?.trim() || text;
    return NextResponse.json({ translated });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json({ translated: text });
  }
}