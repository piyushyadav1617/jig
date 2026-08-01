const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ModelMessage = {
  role: "user" | "system" | "assistant";
  content: string;
};

export type StreamModelOptions = {
  apiKey?: string;
  model: string;
  messages: ModelMessage[];
};

function getApiKey(provided?: string): string {
  const key = provided ?? process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "Missing OpenRouter API key. Set OPENROUTER_API_KEY env var or pass apiKey option.",
    );
  }
  return key;
}

export async function* streamModel({
  apiKey,
  model,
  messages,
}: StreamModelOptions): AsyncGenerator<string, void, unknown> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey(apiKey)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter request failed (${response.status} ${response.statusText}): ${text}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;

        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // Ignore malformed JSON chunks; streaming continues.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function askModel(options: StreamModelOptions): Promise<string> {
  let result = "";
  for await (const chunk of streamModel(options)) result += chunk;
  return result;
}
