export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType, userSpecs } = req.body;

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const sys = `You are the AI content engine for "The Jersey Guys", a football jersey business in India. Co-founders: Agastya Gala, Arhaan Ladakh, Yuvaan Khare, Shaurya Desai, Shivaan Desai. Return ONLY valid JSON, no markdown, no backticks. {"detectedJersey":"Team and kit type","imagePrompt":"Detailed AI image generation prompt with thematic country/team background, dramatic studio lighting, hyper-realistic 4K editorial product photography, ghost mannequin or flat lay presentation","caption":"Instagram caption 3-5 sentences with football culture language and CTA like DM to order","postFormat":"Single post or carousel or Reel suggestion with details","hashtags":"25-30 hashtags space-separated including #TheJerseyGuys #JerseyGuys","storyCaption":"1-2 punchy lines for Stories or Reels","tagSuggestions":"3-5 Instagram accounts to tag for reach","productListing":"3-4 sentence product description for WhatsApp or website","contentIdeas":["idea1","idea2","idea3"]}`;

  const prompt = userSpecs ? `Analyze this jersey. Extra specs: ${userSpecs}` : 'Analyze this jersey and generate all content.';

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              { text: prompt }
            ]
          }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2000 }
        })
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      return res.status(geminiRes.status).json({ error: err.error?.message || 'Gemini API error' });
    }

    const data = await geminiRes.json();
    const text = data.candidates[0].content.parts[0].text.trim().replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
