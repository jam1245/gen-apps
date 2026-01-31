// config.js — EDIT THESE VALUES to match your organization and assistants
const CONFIG = {
  // --- API Connection ---
  BASE_URL: "https://api.ai.us.lmco.com/v1",
  ORGANIZATION: "RMS EPT Assistant Sandbox",

  // --- Assistants (update IDs when assistants change) ---
  ASSISTANTS: {
    PM_COLLABORATOR: {
      id: "02323469-2286-4d70-81f7-58862f2732f6",
      name: "PM Collaborator",
      color: "#2563eb",
      keywords: [
        "schedule", "planning", "collaboration", "project", "timeline",
        "milestone", "task", "resource", "stakeholder", "scope",
        "deliverable", "program", "gantt", "dependency", "sprint"
      ]
    },
    RISK_OPPORTUNITY: {
      id: "70a49d3b-5cfb-43ef-994e-b558433b483f",
      name: "Risk & Opportunity",
      color: "#dc2626",
      keywords: [
        "risk", "opportunity", "mitigation", "threat", "impact",
        "likelihood", "rio", "issue", "contingency", "exposure",
        "probability", "severity", "residual", "watch list"
      ]
    },
    CAM_AGENT: {
      id: "80a8ae74-5c29-450f-9fa1-f0330b80d8c1",
      name: "CAM Agent",
      color: "#059669",
      keywords: [
        "control account", "cam", "budget", "earned value", "evm",
        "variance", "baseline", "wbs", "cost", "bcws", "bcwp",
        "acwp", "eac", "etc", "cpi", "spi"
      ]
    }
  },

  // Max conversation exchanges to pass as context (older messages are dropped)
  MAX_HISTORY: 10
};
