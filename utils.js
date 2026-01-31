// utils.js — intent detection and DOM helpers
var Utils = {
  /**
   * Score the user message against each assistant's keywords.
   * Returns which agent(s) to invoke and whether to run them in parallel.
   */
  analyzeIntent: function (message) {
    var lower = message.toLowerCase();
    var scores = {};
    var keys = Object.keys(CONFIG.ASSISTANTS);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var agent = CONFIG.ASSISTANTS[key];
      scores[key] = 0;
      for (var j = 0; j < agent.keywords.length; j++) {
        if (lower.indexOf(agent.keywords[j]) !== -1) {
          scores[key]++;
        }
      }
    }

    var maxScore = 0;
    for (var k in scores) {
      if (scores[k] > maxScore) maxScore = scores[k];
    }

    if (maxScore === 0) {
      // No keyword match — default to PM Collaborator
      return { agents: ["PM_COLLABORATOR"], mode: "single" };
    }

    var topAgents = [];
    for (var k in scores) {
      if (scores[k] === maxScore) topAgents.push(k);
    }

    return {
      agents: topAgents,
      mode: topAgents.length > 1 ? "parallel" : "single"
    };
  },

  /**
   * Build a chat message DOM element.
   * @param {"user"|"agent"} role
   * @param {string|null}    agentKey  Key into CONFIG.ASSISTANTS (null for user)
   * @param {string}         text      Initial text content
   * @returns {{ el: HTMLElement, contentEl: HTMLElement }}
   */
  createMessageEl: function (role, agentKey, text) {
    var msg = document.createElement("div");
    msg.className = "message " + role;

    if (role === "agent" && agentKey && CONFIG.ASSISTANTS[agentKey]) {
      var agent = CONFIG.ASSISTANTS[agentKey];

      var label = document.createElement("div");
      label.className = "agent-label";
      label.style.color = agent.color;
      label.textContent = agent.name;
      msg.appendChild(label);

      msg.style.borderLeftColor = agent.color;
    }

    var content = document.createElement("div");
    content.className = "message-content";
    content.textContent = text || "";
    msg.appendChild(content);

    return { el: msg, contentEl: content };
  },

  /** Small helper to add a system info line in the messages pane. */
  createRouteIndicator: function (text) {
    var el = document.createElement("div");
    el.className = "route-info";
    el.textContent = text;
    return el;
  }
};
