const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());

// 允許所有來源或指定你的前端網址
app.use(cors());

app.post('/api/forge', async (req, res) => {
  try {
    const { topic, platform, audience, tone } = req.body;
    const DIFY_API_KEY = process.env.DIFY_API_KEY;
    const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1/workflows/run';

    if (!DIFY_API_KEY) {
      return res.status(500).json({ error: 'Missing DIFY_API_KEY on server' });
    }

    const response = await fetch(DIFY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {
          topic: topic,
          platform: platform,
          target_audience: audience,
          tone: tone || 'authoritative'
        },
        response_mode: 'blocking',
        user: 'flameforge_client'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Dify forge failed', details: errText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Forge Gateway Error:', error);
    res.status(500).json({ error: 'Internal gateway error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FlameForge Gateway running on port ${PORT}`));
