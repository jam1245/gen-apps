// orchestrator.js — wires the UI, routes messages, manages conversation state
var Orchestrator = {
  history: [],        // array of { user: string, responses: [{ agent: string, text: string }] }
  selectedAgent: "auto",

  init: function () {
    var self = this;

    // --- API key ---
    var saveBtn = document.getElementById("save-key-btn");
    var keyInput = document.getElementById("api-key-input");
    var app = document.getElementById("app");

    saveBtn.addEventListener("click", function () {
      var key = keyInput.value.trim();
      if (!key) return;
      sessionStorage.setItem("apiKey", key);
      app.classList.remove("hidden");
      keyInput.value = "";
      keyInput.placeholder = "Key saved for this session";
    });

    // --- Send ---
    var sendBtn = document.getElementById("send-btn");
    var input = document.getElementById("prompt-input");

    sendBtn.addEventListener("click", function () { self.send(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        self.send();
      }
    });

    // --- Agent selector ---
    var buttons = document.querySelectorAll(".agent-btn");
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          for (var j = 0; j < buttons.length; j++) buttons[j].classList.remove("active");
          btn.classList.add("active");
          self.selectedAgent = btn.getAttribute("data-agent");
        });
      })(buttons[i]);
    }
  },

  /** Build the messages array sent inside the thread payload. */
  buildThreadMessages: function (currentPrompt) {
    var msgs = [];
    var start = Math.max(0, this.history.length - CONFIG.MAX_HISTORY);

    for (var i = start; i < this.history.length; i++) {
      var entry = this.history[i];
      msgs.push({ role: "user", content: entry.user });

      // Combine all agent responses into a single assistant turn
      var parts = [];
      for (var j = 0; j < entry.responses.length; j++) {
        parts.push(entry.responses[j].text);
      }
      msgs.push({ role: "assistant", content: parts.join("\n\n") });
    }

    msgs.push({ role: "user", content: currentPrompt });
    return msgs;
  },

  send: async function () {
    var input = document.getElementById("prompt-input");
    var sendBtn = document.getElementById("send-btn");
    var messagesPane = document.getElementById("messages");

    var prompt = input.value.trim();
    if (!prompt) return;

    // --- User bubble ---
    var userMsg = Utils.createMessageEl("user", null, prompt);
    messagesPane.appendChild(userMsg.el);
    input.value = "";
    sendBtn.disabled = true;

    // --- Determine routing ---
    var agentKeys, mode;
    if (this.selectedAgent === "auto") {
      var intent = Utils.analyzeIntent(prompt);
      agentKeys = intent.agents;
      mode = intent.mode;
    } else {
      agentKeys = [this.selectedAgent];
      mode = "single";
    }

    // --- Routing indicator ---
    var names = [];
    for (var n = 0; n < agentKeys.length; n++) {
      names.push(CONFIG.ASSISTANTS[agentKeys[n]].name);
    }
    messagesPane.appendChild(
      Utils.createRouteIndicator("Routing to: " + names.join(" + "))
    );
    messagesPane.scrollTop = messagesPane.scrollHeight;

    // --- Thread messages with history ---
    var threadMessages = this.buildThreadMessages(prompt);
    var historyEntry = { user: prompt, responses: [] };

    try {
      if (mode === "parallel" && agentKeys.length > 1) {
        await this.callParallel(agentKeys, threadMessages, messagesPane, historyEntry);
      } else {
        await this.callSingle(agentKeys[0], threadMessages, messagesPane, historyEntry);
      }
    } catch (err) {
      var errEl = Utils.createMessageEl("agent", null, "Error: " + err.message);
      errEl.el.classList.add("error");
      messagesPane.appendChild(errEl.el);
    }

    this.history.push(historyEntry);
    sendBtn.disabled = false;
    messagesPane.scrollTop = messagesPane.scrollHeight;
  },

  /** Call a single assistant and stream the response. */
  callSingle: async function (agentKey, threadMessages, pane, historyEntry) {
    var agent = CONFIG.ASSISTANTS[agentKey];
    var bubble = Utils.createMessageEl("agent", agentKey, "");
    pane.appendChild(bubble.el);
    pane.scrollTop = pane.scrollHeight;

    var result = await ApiClient.callAssistant(
      agent.id,
      threadMessages,
      function (chunk) {
        bubble.contentEl.textContent += chunk;
        pane.scrollTop = pane.scrollHeight;
      }
    );

    historyEntry.responses.push({ agent: agentKey, text: result });
  },

  /** Call multiple assistants in parallel, each streaming into its own bubble. */
  callParallel: async function (agentKeys, threadMessages, pane, historyEntry) {
    var bubbles = {};
    for (var i = 0; i < agentKeys.length; i++) {
      var key = agentKeys[i];
      var bubble = Utils.createMessageEl("agent", key, "");
      pane.appendChild(bubble.el);
      bubbles[key] = bubble;
    }
    pane.scrollTop = pane.scrollHeight;

    var promises = [];
    for (var i = 0; i < agentKeys.length; i++) {
      (function (k) {
        var agent = CONFIG.ASSISTANTS[k];
        var p = ApiClient.callAssistant(
          agent.id,
          threadMessages,
          function (chunk) {
            bubbles[k].contentEl.textContent += chunk;
            pane.scrollTop = pane.scrollHeight;
          }
        ).then(function (text) {
          historyEntry.responses.push({ agent: k, text: text });
        }).catch(function (err) {
          bubbles[k].contentEl.textContent = "Error: " + err.message;
          bubbles[k].el.classList.add("error");
        });
        promises.push(p);
      })(agentKeys[i]);
    }

    await Promise.all(promises);
  }
};

document.addEventListener("DOMContentLoaded", function () {
  Orchestrator.init();
});
