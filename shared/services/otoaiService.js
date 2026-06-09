import { OTOAI_SYSTEM_PROMPT } from '../constants/index.js';

export const sendMessage = async (apiKey, userMessage, conversationHistory = []) => {
  try {
    const contents = [
      ...conversationHistory.map((msg) => {
        if (msg.parts) return msg;
        return {
          role: msg.role === 'assistant' ? 'model' : msg.role,
          parts: [{ text: msg.content || msg.text }]
        };
      }),
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [
              {
                text: OTOAI_SYSTEM_PROMPT
              }
            ]
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { reply, error: null };
  } catch (error) {
    return { reply: null, error: error.message };
  }
};
