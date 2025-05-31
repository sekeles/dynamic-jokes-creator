const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(cors());
app.use(bodyParser.json());

const extendedTopics = [
  "חיים", "אהבה", "עבודה", "פילוסופיה", "בינה מלאכותית",
  "חברות", "משפחה", "טכנולוגיה", "פסיכולוגיה", "ילדות",
  "בריאות", "מדע", "טבע", "מוזיקה", "אוכל",
  "מסעות", "הומור", "אקטואליה", "רוחניות", "פוליטיקה"
];

const translateToEnglish = async (text) => {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: `Translate to English: "${text}"` }],
      temperature: 0,
      max_tokens: 60
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    }
  );
  return response.data.choices[0].message.content.trim();
};

app.post('/generate', async (req, res) => {
  const { age, gender, topic, keywords, quote, language, model = 'gpt-3.5-turbo' } = req.body;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API key not set on server' });
  }

  const buildPrompt = async (lang) => {
    const isHebrew = lang === 'he';
    let topicLang = topic;
    let keywordsLang = keywords;

    if (!isHebrew) {
      if (topic) topicLang = await translateToEnglish(topic);
      if (keywords) keywordsLang = await translateToEnglish(keywords);
    }

    if (quote) {
      return isHebrew
        ? `מצא ציטוט מעורר השראה בנושא "${topic}"${keywords ? ` שכולל את המילים: ${keywords}` : ''}. ציין מי אמר אותו.`
        : `Find an inspiring quote on the topic of "${topicLang}"${keywordsLang ? ` that includes the words: ${keywordsLang}` : ''}. Mention who said it.`;
    } else {
      return isHebrew
        ? `צור בדיחה מקורית, מצחיקה ואינטליגנטית בנושא "${topic}". הימנע משימוש בגיל או מגדר של המשתמש בטקסט עצמו.${keywords ? ` כלול את המילים: ${keywords}.` : ''}`
        : `Create an original, clever and funny joke on the topic of "${topicLang}". Avoid using the user's age or gender in the text.${keywordsLang ? ` Include the words: ${keywordsLang}.` : ''}`;
    }
  };

  const runOpenAI = async (prompt, selectedModel) => {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: selectedModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 300
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    return response.data.choices[0].message.content;
  };

  try {
    if (language === 'both') {
      const [jokeHe, jokeEn] = await Promise.all([
        runOpenAI(await buildPrompt('he'), model),
        runOpenAI(await buildPrompt('en'), model)
      ]);
      res.json({ result: `בדיחה עברית:\n${jokeHe}\n\nJoke in English:\n${jokeEn}` });
    } else {
      const result = await runOpenAI(await buildPrompt(language), model);
      res.json({ result });
    }
  } catch (err) {
    console.error("OpenAI API error:", err.message);
    console.error("Response data:", err.response?.data);
    res.status(500).json({ error: 'שגיאה בבקשת OpenAI', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Joke/Quote API is running on http://localhost:${PORT}`);
});