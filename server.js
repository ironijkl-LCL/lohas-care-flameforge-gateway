// server.js
const express = require('express');
const cors = require('cors');
const { Readable } = require('stream');

const app = express();
app.use(express.json());
app.use(cors());

// 1. 健康檢查探針端點 (供前端 0 秒檢測 Render 是否休眠，或提前喚醒)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

app.get('/', (req, res) => {
  res.status(200).send('FlameForge Gateway is active.');
});

// 2. 核心鍛造 API
app.post('/api/forge', async (req, res) => {
  try {
    const { topic, platform, audience, tone, action, seed, temperature } = req.body;
    const DIFY_API_KEY = process.env.DIFY_API_KEY;
    const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1/workflows/run';

    if (!DIFY_API_KEY) {
      return res.status(500).json({ error: 'Missing DIFY_API_KEY on server' });
    }

    // 向 Dify 發起請求
    const difyResponse = await fetch(DIFY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {
          topic,
          platform,
          target_audience: audience,
          tone: tone || 'authoritative',
          action: action || 'generate',
          temperature: temperature || 0.7
        },
        response_mode: 'streaming', // 啟用串流
        user: 'flameforge_client'
      })
    });

    if (!difyResponse.ok) {
      const errText = await difyResponse.text();
      console.error('Dify API Error:', difyResponse.status, errText);
      return res.status(difyResponse.status).json({ error: 'Dify forge failed', details: errText });
    }

    // 建立標準 SSE 串流標頭
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 串流管線直通客戶端
    if (difyResponse.body) {
      Readable.fromWeb(difyResponse.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Gateway Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal gateway error', message: error.message });
    }
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`FlameForge Gateway running on port ${PORT}`));
