import { ModelOption, Provider } from '../types';

// Helper to detect CORS/Network errors
const handleFetchError = (error: any, providerName: string) => {
  if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
    throw new Error(
      `CORS/Network Error: The ${providerName} endpoint blocked this browser request. ` +
      `Use a CORS-compatible proxy URL (e.g., a Cloudflare Worker) as the Base URL, or add the model ID manually below.`
    );
  }
  throw error;
};

// --- OpenAI Services ---

export const fetchOpenAIModels = async (baseUrl: string, apiKey: string): Promise<ModelOption[]> => {
  if (!apiKey) throw new Error("API Key required");
  
  const url = baseUrl.replace(/\/$/, "") + "/models";
  
  try {
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });

    if (!response.ok) {
       const errorText = await response.text().catch(() => response.statusText);
       throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
    }
    
    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) throw new Error("Invalid API response format");

    return data.data
      .filter((m: any) => m.id && (m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('davinci'))) 
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        provider: Provider.OPENAI
      }));
  } catch (error: any) {
    return handleFetchError(error, 'OpenAI');
  }
};

export const generateOpenAIContent = async (
  baseUrl: string,
  apiKey: string,
  modelId: string,
  prompt: string,
  systemInstruction?: string
): Promise<{ text: string; latency: number; ttft: number }> => {
  if (!apiKey) throw new Error("OpenAI API Key is missing.");

  const startTime = performance.now();
  let ttft = 0;
  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: systemInstruction || "" },
          { role: "user", content: prompt }
        ],
        stream: true 
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(err.error?.message || `Request Failed: ${response.status}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let fullText = "";

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      
      if (value) {
        if (ttft === 0) ttft = performance.now();
        const chunkValue = decoder.decode(value);
        const lines = chunkValue.split("\n").filter(line => line.trim() !== "");
        
        for (const line of lines) {
          if (line === "data: [DONE]") continue;
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.replace("data: ", ""));
              const content = json.choices[0]?.delta?.content || "";
              fullText += content;
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    }

    const endTime = performance.now();
    return {
      text: fullText,
      latency: Math.round(endTime - startTime),
      ttft: Math.round(ttft - startTime)
    };

  } catch (error: any) {
    return handleFetchError(error, 'OpenAI');
  }
};

// --- Anthropic Services ---

export const generateAnthropicContent = async (
  baseUrl: string,
  apiKey: string,
  modelId: string,
  prompt: string,
  systemInstruction?: string
): Promise<{ text: string; latency: number; ttft: number }> => {
  if (!apiKey) throw new Error("Anthropic API Key is missing.");
  
  const startTime = performance.now();
  let ttft = 0;
  const url = baseUrl.replace(/\/$/, "") + "/messages";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "dangerously-allow-browser": "true" 
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 1024,
        system: systemInstruction,
        messages: [{ role: "user", content: prompt }],
        stream: true
      })
    });
    
    if (!response.ok) {
      try {
         const err = await response.json();
         if (err.type === 'error') throw new Error(err.error?.message);
      } catch (e) {}
      throw new Error(`Anthropic Request Failed: ${response.status}`);
    }
    
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let fullText = "";

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      if (value) {
        if (ttft === 0) ttft = performance.now();
        const chunkValue = decoder.decode(value);
        const lines = chunkValue.split("\n").filter(line => line.trim() !== "");

        for (const line of lines) {
           if (line.startsWith("data: ")) {
             const dataStr = line.replace("data: ", "");
             try {
               const event = JSON.parse(dataStr);
               if (event.type === 'content_block_delta' && event.delta?.text) {
                 fullText += event.delta.text;
               }
             } catch (e) {}
           }
        }
      }
    }

    const endTime = performance.now();
    return {
      text: fullText,
      latency: Math.round(endTime - startTime),
      ttft: Math.round(ttft - startTime)
    };

  } catch (error: any) {
    return handleFetchError(error, 'Anthropic');
  }
};

// --- Gemini REST Services ---

export const fetchGeminiModels = async (baseUrl: string, apiKey: string): Promise<ModelOption[]> => {
  if (!apiKey) throw new Error("API Key required");
  
  // Attempt to list models. Note: standard Google API might block this in browser unless using a proxy.
  const url = `${baseUrl.replace(/\/$/, "")}/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    
    const data = await response.json();
    if (!data.models) return [];

    return data.models
      .filter((m: any) => m.name.includes('generateContent') || m.name.includes('gemini'))
      .map((m: any) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name,
        provider: Provider.GOOGLE
      }));
  } catch (error: any) {
    return handleFetchError(error, 'Google Gemini');
  }
};

export const generateGeminiContentRest = async (
  baseUrl: string,
  apiKey: string,
  modelId: string,
  prompt: string,
  systemInstruction?: string
): Promise<{ text: string; latency: number; ttft: number }> => {
  const startTime = performance.now();
  let ttft = 0;
  
  // Standard Gemini format: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent
  const url = `${baseUrl.replace(/\/$/, "")}/models/${modelId}:streamGenerateContent?key=${apiKey}&alt=sse`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
      })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini REST Error: ${response.status}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let fullText = "";

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      
      if (value) {
        if (ttft === 0) ttft = performance.now();
        const chunkValue = decoder.decode(value);
        
        const lines = chunkValue.split("\n").filter(l => l.trim() !== "");
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                try {
                    const jsonStr = line.substring(6).trim();
                    if (jsonStr === "[DONE]") continue;
                    const json = JSON.parse(jsonStr);
                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) fullText += text;
                } catch (e) {
                    // console.warn("Parse error", e);
                }
            }
        }
      }
    }

    const endTime = performance.now();
    return {
      text: fullText,
      latency: Math.round(endTime - startTime),
      ttft: Math.round(ttft - startTime)
    };

  } catch (error: any) {
    return handleFetchError(error, 'Google Gemini');
  }
};
