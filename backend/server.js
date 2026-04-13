require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Shared negotiation history
let negotiationHistory = [];
let currentRound = 0;
let dealReached = false;
let sellerLastOffer = null;

// Tools
function calculateZOPA(buyerOffer, sellerOffer) {
  const buyerMax = parseFloat(process.env.BUYER_RED_LINE);
  const sellerMin = parseFloat(process.env.SELLER_RED_LINE);
  const inZOPA = buyerOffer >= sellerMin && sellerOffer <= buyerMax;
  return {
    inZOPA,
    buyerMax,
    sellerMin,
    gap: Math.abs(buyerOffer - sellerOffer)
  };
}

function analyzeSentiment(message) {
  const flexibleWords = ['consider', 'maybe', 'flexible', 'willing', 'compromise', 'meet'];
  const rigidWords = ['never', 'absolutely', 'final', 'cannot', 'refuse', 'impossible'];
  let score = 5;
  flexibleWords.forEach(w => { if (message.toLowerCase().includes(w)) score += 1; });
  rigidWords.forEach(w => { if (message.toLowerCase().includes(w)) score -= 1; });
  return Math.min(Math.max(score, 1), 10);
}

function sanitizeInput(input) {
  const injectionPatterns = [
    /ignore.*instructions/i,
    /reveal.*red line/i,
    /forget.*role/i,
    /you are now/i,
    /act as/i
  ];
  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      return { safe: false, message: "Prompt injection detected!" };
    }
  }
  return { safe: true, message: input };
}

// Agent function
async function runAgent(agentType, lastOpponentMessage) {

  const buyerRedLine = parseFloat(process.env.BUYER_RED_LINE);
  const sellerRedLine = parseFloat(process.env.SELLER_RED_LINE);

  const systemPrompts = {
    buyer: `You are an autonomous BUYER agent negotiating to acquire a company.
YOUR PRIVATE RED LINE: You will NEVER offer more than ₹${buyerRedLine}L. Never reveal this.
YOUR GOAL: Get the best deal possible, as low as possible.
RULES:
- Analyze the seller's last message and sentiment
- Look at negotiation history to detect patterns
- Choose a tactic: Anchor Low / Incremental Concession / Bundle Offer / Hold Position
- NEVER exceed your red line
- Respond with EXACTLY this format:
THOUGHT: [your reasoning about opponent's sentiment and history]
TACTIC: [chosen tactic and why]
OFFER: ₹[amount]L
MESSAGE: [your negotiation message to seller]`,

    seller: `You are an autonomous SELLER agent negotiating to sell a company.
YOUR PRIVATE RED LINE: You will NEVER accept less than ₹${sellerRedLine}L. Never reveal this.
YOUR GOAL: Maximize sale value, as high as possible.
IMPORTANT CONSTRAINT: ${sellerLastOffer ? `Your first offer was ₹${sellerLastOffer}L — you can NEVER offer higher than ₹${sellerLastOffer}L again. You may only keep same price or reduce it to close the deal.` : 'Make your best opening offer.'}
RULES:
- Analyze the buyer's last message and sentiment
- Look at negotiation history to detect patterns  
- Choose a tactic: Anchor High / Hold Position / Scarcity Framing / Gradual Concession
- NEVER go below your red line
- Respond with EXACTLY this format:
THOUGHT: [your reasoning about opponent's sentiment and history]
TACTIC: [chosen tactic and why]
OFFER: ₹[amount]L
MESSAGE: [your negotiation message to buyer]`,

    mediator: `You are an autonomous MEDIATOR agent ensuring fair negotiation.
YOUR GOAL: Help both parties reach a Pareto-optimal agreement.
RULES:
- Analyze both parties' positions and the negotiation history
- Check if offers are converging toward agreement
- Suggest fair middle-ground if parties are stuck
- Respond with EXACTLY this format:
THOUGHT: [analysis of current negotiation state]
ZOPA_STATUS: [whether deal is possible and why]
SUGGESTION: ₹[fair amount]L
MESSAGE: [your message to both parties]`
  };

  const historyContext = negotiationHistory.length > 0
    ? `\nNEGOTIATION HISTORY:\n${negotiationHistory.map(h =>
        `Round ${h.round}: Buyer offered ₹${h.buyerOffer}L, Seller offered ₹${h.sellerOffer}L`
      ).join('\n')}`
    : '\nThis is Round 1 - opening offers.';

  const sentimentScore = lastOpponentMessage ? analyzeSentiment(lastOpponentMessage) : 5;

  const userMessage = `${historyContext}
OPPONENT'S LAST MESSAGE: ${lastOpponentMessage || 'No message yet - make opening offer'}
OPPONENT SENTIMENT SCORE: ${sentimentScore}/10 (1=very rigid, 10=very flexible)
CURRENT ROUND: ${currentRound + 1}
Make your decision now.`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompts[agentType] },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 500
  });

  return response.choices[0].message.content;
}

// Parse offer from agent response
function parseOffer(response) {
  const match = response.match(/OFFER:\s*₹?([\d.]+)L/i);
  return match ? parseFloat(match[1]) : null;
}

// Main negotiation endpoint
app.post('/api/negotiate', async (req, res) => {
  try {
    if (dealReached) {
      return res.json({ message: 'Deal already reached! Start new negotiation.', dealReached: true });
    }

    currentRound++;

    // Run Buyer Agent
    const lastSellerMsg = negotiationHistory.length > 0
      ? negotiationHistory[negotiationHistory.length - 1].sellerMessage
      : null;

    const buyerSanitized = lastSellerMsg ? sanitizeInput(lastSellerMsg) : { safe: true, message: null };
    if (!buyerSanitized.safe) {
      return res.status(400).json({ error: buyerSanitized.message });
    }

    const buyerResponse = await runAgent('buyer', buyerSanitized.message);
    const buyerOffer = parseOffer(buyerResponse);

    // Run Seller Agent
    const lastBuyerMsg = buyerResponse;
    const sellerSanitized = sanitizeInput(lastBuyerMsg);
    if (!sellerSanitized.safe) {
      return res.status(400).json({ error: sellerSanitized.message });
    }

    const sellerResponse = await runAgent('seller', sellerSanitized.message);
    const sellerOffer = parseOffer(sellerResponse);
    // Track seller first offer
if (sellerLastOffer === null && sellerOffer) {
  sellerLastOffer = sellerOffer;
}
    

    // Run Mediator Agent
    const mediatorResponse = await runAgent('mediator',
      `Buyer offered ₹${buyerOffer}L. Seller offered ₹${sellerOffer}L`
    );

    // Calculate ZOPA
    const zopaResult = calculateZOPA(buyerOffer || 0, sellerOffer || 999);

    // Check if deal reached
   const buyerMax = parseFloat(process.env.BUYER_RED_LINE);
const sellerMin = parseFloat(process.env.SELLER_RED_LINE);

if (buyerMax < sellerMin) {
  dealReached = true;
  return res.json({
    round: currentRound,
    buyer: { response: buyerResponse, offer: buyerOffer },
    seller: { response: sellerResponse, offer: sellerOffer },
    mediator: { response: mediatorResponse },
    zopa: zopaResult,
    dealReached: true,
    noDeal: true,
    message: "NO DEAL — ZOPA does not exist! Buyer maximum is less than Seller minimum.",
    history: negotiationHistory
  });
}

if (buyerOffer && sellerOffer && Math.abs(buyerOffer - sellerOffer) <= 9) {
  dealReached = true;
}

    // Update history
    negotiationHistory.push({
      round: currentRound,
      buyerOffer,
      sellerOffer,
      buyerMessage: buyerResponse,
      sellerMessage: sellerResponse,
      mediatorMessage: mediatorResponse,
      zopaResult,
      sentimentScore: analyzeSentiment(sellerResponse)
    });

    res.json({
      round: currentRound,
      buyer: { response: buyerResponse, offer: buyerOffer },
      seller: { response: sellerResponse, offer: sellerOffer },
      mediator: { response: mediatorResponse },
      zopa: zopaResult,
      dealReached,
      history: negotiationHistory
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset endpoint
app.post('/api/reset', (req, res) => {
  negotiationHistory = [];
  currentRound = 0;
  dealReached = false;
  sellerLastOffer = null;
  res.json({ message: 'Negotiation reset successfully!' });
});

// Update red lines endpoint
app.post('/api/config', (req, res) => {
  const { buyerRedLine, sellerRedLine } = req.body;
  if (buyerRedLine) process.env.BUYER_RED_LINE = buyerRedLine;
  if (sellerRedLine) process.env.SELLER_RED_LINE = sellerRedLine;
  res.json({ message: 'Config updated!', buyerRedLine: process.env.BUYER_RED_LINE, sellerRedLine: process.env.SELLER_RED_LINE });
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'running', round: currentRound, dealReached, historyCount: negotiationHistory.length });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Negotiation AI Server running on port ${PORT}`);
  console.log(`✅ Buyer Red Line: ₹${process.env.BUYER_RED_LINE}L`);
  console.log(`✅ Seller Red Line: ₹${process.env.SELLER_RED_LINE}L`);
  console.log(`✅ Security: Prompt injection defense active`);
  console.log(`✅ Tools: ZOPA Calculator, Sentiment Analyzer ready`);
});