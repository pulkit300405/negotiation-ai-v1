# MultiAgent Negotiation System

A multi-agent AI system where three autonomous LLM agents — **Buyer**, **Seller**, and **Mediator** — negotiate deals in real-time using the **ReAct (Reasoning + Acting)** framework.

Built with Groq's LLaMA-3.3-70B, Node.js/Express backend, and React frontend.

> 🏆 3rd Place — Agentic AI Hackathon @ MAIT, New Delhi (1,100+ registrations)

---

## Features

- 3 autonomous agents with distinct personas and goals
- ReAct framework — agents reason before acting
- ZOPA calculator — computes Zone of Possible Agreement
- Sentiment scoring on each agent's messages
- Prompt injection defense
- Live negotiation feed UI

---

## Tech Stack

- **Frontend** — React
- **Backend** — Node.js, Express
- **LLM** — Groq API (LLaMA-3.3-70B)

---

## Setup

```bash
# Clone
git clone https://github.com/pulkit300405/MultiAgent-Negotiation-.git
cd MultiAgent-Negotiation-

# Backend
cd backend
npm install

# Add your Groq API key
echo "GROQ_API_KEY=your_key_here" > .env

# Run backend
node server.js

# Frontend (new terminal)
cd ../frontend
npm install
npm start
```

App runs at `http://localhost:3000`

---

## Project Structure

```
├── backend/
│   ├── server.js       # Express server + all 3 agents + ZOPA logic
│   └── package.json
├── frontend/
│   └── src/
│       ├── App.js      # Main React UI
│       └── App.css
└── .gitignore
```

---

## Team ZeroLatency

- Pulkit Singh — Backend & Agent Architecture
- Rishank Sharma — Frontend
- Karan Gola — LLM Integration
- Atharva Sharma — ZOPA Logic & Testing
