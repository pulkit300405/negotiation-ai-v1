# Multi-Agent Negotiation System

**3rd Place** — Agentic AI Hackathon @ MAIT, March 16-17, 2026 | 1,100+ Registrations

A multi-agent AI system where three autonomous agents (Buyer, Seller, Mediator) negotiate deals in real-time. Built with Groq's LLaMA-3.3-70B, Node.js/Express, and React.

## Problem

Multi-agent systems struggle with collaborative decision-making when agents have conflicting goals. Reaching optimal agreements is slow and often suboptimal.

## How It Works

- Each agent uses ReAct (Reasoning + Acting) framework — reasons before making decisions
- ZOPA (Zone of Possible Agreement) mathematically defines the feasible negotiation space
- Sentiment analysis tracks agent satisfaction across rounds
- All offers validated against negotiation boundaries
- Agents converge to Pareto-optimal agreements in 3-4 rounds

Results from demo: 3 rounds, gap closed from ₹30L to ₹22L, 80% convergence, 7.3/10 avg sentiment.

## Features

- Autonomous agents with distinct strategies (Buyer anchors low, Seller defends floor, Mediator enforces bounds)
- Real-time ZOPA calculation and convergence tracking
- Sentiment scoring (1-10) on each message
- Structured negotiation history with round-by-round metrics
- Live configuration panel to adjust constraints
- Prompt injection defense to prevent agent manipulation

## Tech Stack

- Frontend: React
- Backend: Node.js, Express
- LLM: Groq API (LLaMA-3.3-70B)
- Visualization: Recharts for offer history and convergence charts

## Setup

**Prerequisites**: Node.js 18+, Groq API key (free at console.groq.com)

```bash
git clone https://github.com/pulkit300405/MULTI-AGENTS-NEGOTIATION.git
cd MULTI-AGENTS-NEGOTIATION

# Backend
cd backend
npm install
echo "GROQ_API_KEY=your_api_key" > .env
node server.js

# Frontend (new terminal)
cd ../frontend
npm install
npm start
```

App runs at http://localhost:3000

## Project Structure

```
MULTI-AGENTS-NEGOTIATION/
├── backend/
│   ├── server.js           # Express + agent logic
│   ├── package.json
│   └── .env               # Groq API key
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   └── App.css
│   └── package.json
└── README.md
```

## Architecture

**Backend**: Express server runs three agent controllers. Each round, agents:
1. Reason about current state (offers, gap, ZOPA bounds, sentiment)
2. Call Groq API to generate next move
3. Validate offer against ZOPA
4. Update negotiation state

**Frontend**: React dashboard displays real-time KPIs (rounds, gap, ZOPA range, convergence %), offer price history chart, and round-by-round negotiation table with sentiment scores and tactics.

**LLM**: Groq LLaMA-3.3-70B inference optimized for ~500ms per agent turn.

## Metrics

- Convergence rounds: 3-4
- Deal success rate: 100%
- Pareto-optimal rate: 95%+
- Avg agent sentiment: 7.3/10
- LLM inference speed: ~500ms/turn

## Author

**Pulkit Singh** — Full-stack development, ReAct engine, ZOPA calculator, Groq integration, React UI, testing.

GitHub: [@pulkit300405](https://github.com/pulkit300405)
