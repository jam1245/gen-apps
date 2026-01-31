const BASE_URL = "https://api.ai.us.lmco.com/v1";
const ASSISTANT_ID = "80a8ae74-5c29-450f-9fa1-f0330b80d8c1"; // CAM Assistant
const ORG_NAME = "RMS EPT Assistant Sandbox";

const saveKeyBtn = document.getElementById("save-key-btn");
const apiKeyInput = document.getElementById("api-key-input");
const chatSection = document.getElementById("chat-section");
const sendBtn = document.getElementById("send-btn");
const promptInput = document.getElementById("prompt-input");
const loading = document.getElementById("loading");
const responseContainer = document.getElementById("response-container");

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  sessionStorage.setItem("apiKey", key);
  chatSection.classList.remove("hidden");
  apiKeyInput.value = "";
  apiKeyInput.placeholder = "Key saved for this session";
});

sendBtn.addEventListener("click", sendPrompt);
promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendPrompt();
  }
});

async function sendPrompt() {
  const apiKey = sessionStorage.getItem("apiKey");
  const prompt = promptInput.value.trim();
  if (!apiKey || !prompt) return;

  loading.classList.remove("hidden");
  responseContainer.textContent = "";
  sendBtn.disabled = true;

  try {
    const res = await fetch(BASE_URL + "/threads/runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
        "OpenAI-Beta": "assistants=v2",
        "OpenAI-Organization": ORG_NAME,
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        thread: {
          messages: [{ role: "user", content: prompt }],
        },
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(res.status + " " + errText);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (
              currentEvent === "thread.message.delta" ||
              parsed.object === "thread.message.delta"
            ) {
              const content = parsed.delta && parsed.delta.content;
              if (content) {
                for (const item of content) {
                  if (item.type === "text" && item.text) {
                    responseContainer.textContent += item.text.value;
                  }
                }
              }
            }
          } catch (e) {
            // skip unparseable lines
          }
        }
      }
    }
  } catch (err) {
    responseContainer.textContent = "Error: " + err.message;
  } finally {
    loading.classList.add("hidden");
    sendBtn.disabled = false;
  }
}
