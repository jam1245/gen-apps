# gen-apps

A browser-based multi-agent orchestration system that coordinates three specialized AI assistants through a single chat interface. Deploys as a static GitHub Pages site with zero build steps and no dependencies.

## Architecture

```
User Input
    |
    v
Orchestrator (orchestrator.js)
    |
    +-- Intent Analysis (utils.js) -- keyword scoring
    |
    +-- routes to one or more agents:
    |       |
    |       +-- PM Collaborator    (blue)   -- project planning & scheduling
    |       +-- Risk & Opportunity (red)    -- RIO identification & mitigation
    |       +-- CAM Agent          (green)  -- control account management
    |
    +-- streams responses via SSE (api-client.js)
    |
    v
Chat UI with color-coded agent bubbles
```

### Message Flow

1. User types a message and hits Send (or Enter).
2. **Auto-Route mode** (default): the orchestrator scores the message against each agent's keyword list. The highest-scoring agent handles it. If agents tie, they run in **parallel** and stream side-by-side.
3. **Manual mode**: click a specific agent button (PM, R&O, CAM) to force routing.
4. The last 10 conversation exchanges are passed as thread context so agents have continuity.
5. Responses stream in real-time into color-coded bubbles labeled with the agent name.

## File Structure

```
gen-apps/
  index.html          Main UI — chat interface with agent selector
  style.css           Styling — agent colors, chat bubbles, responsive layout
  config.js           Configuration — org name, assistant IDs, keywords
  api-client.js       API wrapper — streaming SSE calls to /threads/runs
  utils.js            Helpers — intent detection, DOM element builders
  orchestrator.js     Core logic — routing, parallel calls, conversation state
  base-api-calls.ipynb  Python notebook with API examples (not deployed)
  gitlab-ci.yml       Legacy GitLab CI config (not used by GitHub Pages)
```

## Quick Start

### 1. Configure

Open `config.js` and set your values:

```javascript
const CONFIG = {
  BASE_URL: "https://api.ai.us.lmco.com/v1",
  ORGANIZATION: "RMS EPT Assistant Sandbox",
  ASSISTANTS: {
    PM_COLLABORATOR: {
      id: "your-pm-assistant-id",
      ...
    },
    RISK_OPPORTUNITY: {
      id: "your-rio-assistant-id",
      ...
    },
    CAM_AGENT: {
      id: "your-cam-assistant-id",
      ...
    }
  }
};
```

Each assistant entry has:

| Field | Purpose |
|---|---|
| `id` | The assistant UUID from the API |
| `name` | Display name shown in the UI |
| `color` | Hex color for the agent's label and bubble border |
| `keywords` | Words that trigger routing to this agent in auto mode |

### 2. Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings > Pages**.
3. Set source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. The site will be live at `https://<user>.github.io/gen-apps/`.

No build step, no CI pipeline, no dependencies.

### 3. Use

1. Open the page and paste your API bearer token into the key field. The token is held in `sessionStorage` only (cleared when the tab closes, never written to disk).
2. The chat interface appears with four routing buttons: **Auto-Route**, **PM**, **R&O**, **CAM**.
3. Type a message and send. The orchestrator routes it to the appropriate agent(s) and streams the response.

## API Details

All calls go to the LM AI Factory API, which follows the OpenAI assistants format.

| Property | Value |
|---|---|
| Base URL | `https://api.ai.us.lmco.com/v1` |
| Assistants endpoint | `POST /threads/runs` |
| Auth | `Authorization: Bearer <token>` |
| Required headers | `OpenAI-Beta: assistants=v2`, `OpenAI-Organization: <org>` |

### Request shape (threads/runs)

```json
{
  "assistant_id": "80a8ae74-5c29-450f-9fa1-f0330b80d8c1",
  "thread": {
    "messages": [
      { "role": "user", "content": "What is my EAC variance?" }
    ]
  },
  "stream": true
}
```

### Streaming response

The response is a server-sent event stream. The UI parses `thread.message.delta` events and extracts text from `delta.content[].text.value`.

## Agents

### PM Collaborator (blue)

General project management assistant. Routes on keywords like: schedule, planning, milestone, timeline, resource, stakeholder, scope, deliverable.

**Assistant ID:** `02323469-2286-4d70-81f7-58862f2732f6`
**Model:** gpt-4o

### Risk & Opportunity (red)

Identifies and assesses risks, issues, and opportunities. Routes on keywords like: risk, opportunity, mitigation, threat, impact, likelihood, contingency.

**Assistant ID:** `70a49d3b-5cfb-43ef-994e-b558433b483f`
**Model:** gpt-4o

### CAM Agent (green)

Control Account Management guidance — budgets, earned value, variances. Routes on keywords like: control account, cam, budget, earned value, evm, variance, baseline, wbs, cost.

**Assistant ID:** `80a8ae74-5c29-450f-9fa1-f0330b80d8c1`
**Model:** gpt-4o-mini

## Routing Logic

In **Auto-Route** mode, the orchestrator scores the user's message against each agent's keyword list. Each keyword match adds one point.

- **Single match**: the top-scoring agent handles the request alone.
- **Tie**: tied agents run in **parallel** — the UI shows one streaming bubble per agent.
- **No match**: defaults to PM Collaborator.

In **Manual** mode, the selected agent always handles the request regardless of keywords.

## Conversation Context

The orchestrator maintains a rolling history of the last 10 exchanges (configurable via `CONFIG.MAX_HISTORY`). On each call, the full history is included in the thread's messages array so the agent has conversational continuity. For parallel responses, all agent outputs are merged into a single assistant turn in the history so subsequent calls see the full picture.

## Adding or Changing Agents

1. Open `config.js`.
2. Add a new entry under `ASSISTANTS` with an `id`, `name`, `color`, and `keywords` array.
3. Add a corresponding button in `index.html` inside the `#agent-selector` div:
   ```html
   <button class="agent-btn" data-agent="YOUR_KEY">Label</button>
   ```
4. Add matching CSS accent rules in `style.css` for the new `data-agent` value.

## CORS Note

The browser makes requests directly to `api.ai.us.lmco.com`. If the API does not return CORS headers for the GitHub Pages origin, requests will be blocked. In that case, network-level access (e.g. VPN) or a proxy would be needed.

## Jupyter Notebook (base-api-calls.ipynb)

The notebook is a Python reference for the same API. It is not part of the deployed site and is excluded from git to protect credentials. It covers:

- Simple `call_llm()` function for chat completions
- Full `LMAIFactoryClient` class (chat, embeddings, assistants, threads, streaming)
- Organization-scoped operations
- Listing available models and assistants

## Security

- API keys are stored in `sessionStorage` only — never persisted to disk or sent anywhere other than the API endpoint.
- Do not commit API tokens to the repository.
- The notebook is excluded from git pushes to protect embedded credentials.
