// api-client.js — handles calls to the assistants threads/runs endpoint
var ApiClient = {
  /**
   * Call an assistant via POST /threads/runs with SSE streaming.
   * @param {string} assistantId  UUID of the assistant
   * @param {Array}  messages     Thread messages ({role, content})
   * @param {Function} onChunk   Called with each text fragment as it arrives
   * @returns {Promise<string>}  The complete response text
   */
  async callAssistant(assistantId, messages, onChunk) {
    var apiKey = sessionStorage.getItem("apiKey");
    if (!apiKey) throw new Error("No API key set");

    var res = await fetch(CONFIG.BASE_URL + "/threads/runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
        "OpenAI-Beta": "assistants=v2",
        "OpenAI-Organization": CONFIG.ORGANIZATION
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        thread: { messages: messages },
        stream: true
      })
    });

    if (!res.ok) {
      var errText = await res.text();
      throw new Error(res.status + " " + errText);
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";
    var currentEvent = "";
    var fullText = "";

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;

      buffer += decoder.decode(chunk.value, { stream: true });
      var lines = buffer.split("\n");
      buffer = lines.pop();

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          var data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            var parsed = JSON.parse(data);
            if (
              currentEvent === "thread.message.delta" ||
              parsed.object === "thread.message.delta"
            ) {
              var content = parsed.delta && parsed.delta.content;
              if (content) {
                for (var j = 0; j < content.length; j++) {
                  if (content[j].type === "text" && content[j].text) {
                    fullText += content[j].text.value;
                    if (onChunk) onChunk(content[j].text.value);
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

    return fullText;
  }
};
