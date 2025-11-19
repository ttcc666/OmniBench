import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize the client with the process.env.API_KEY as strictly required
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGeminiContent = async (
  modelId: string,
  prompt: string,
  systemInstruction?: string
): Promise<{ text: string; latency: number; ttft: number }> => {
  const startTime = performance.now();
  let firstTokenTime = 0;

  try {
    // We use streaming to capture TTFT (Time To First Token)
    const responseStream = await ai.models.generateContentStream({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    let fullText = "";
    
    for await (const chunk of responseStream) {
      if (firstTokenTime === 0) {
        firstTokenTime = performance.now();
      }
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        fullText += c.text;
      }
    }

    const endTime = performance.now();
    
    // If response was instantaneous or empty for some reason, handle ttft
    if (firstTokenTime === 0) firstTokenTime = endTime;

    return {
      text: fullText,
      latency: Math.round(endTime - startTime),
      ttft: Math.round(firstTokenTime - startTime)
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Unknown Gemini API Error");
  }
};

export const checkGeminiConnectivity = async (modelId: string): Promise<number> => {
  const start = performance.now();
  await ai.models.generateContent({
    model: modelId,
    contents: "ping",
    config: { maxOutputTokens: 1 }
  });
  return Math.round(performance.now() - start);
};