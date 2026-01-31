const API_URL = "https://api.ai.us.lmco.com/v1/chat/completions";

const saveKeyBtn = document.getElementById("save-key-btn");
const apiKeyInput = document.getElementById("api-key-input");
const chatSection = document.getElementById("chat-section");
const sendBtn = document.getElementById("send-btn");
const promptInput = document.getElementById("prompt-input");
const modelSelect = document.getElementById("model-select");
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
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: modelSelect.value,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(res.status + " " + errText);
    }

    const data = await res.json();
    responseContainer.textContent = data.choices[0].message.content;
  } catch (err) {
    responseContainer.textContent = "Error: " + err.message;
  } finally {
    loading.classList.add("hidden");
    sendBtn.disabled = false;
  }
}
