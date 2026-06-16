import { OTOAI_SYSTEM_PROMPT } from '../constants/index.js';

export const sendMessage = async (apiKey, userMessage, conversationHistory = [], imageUrl = null) => {
  try {
    const userParts = [];
    if (imageUrl) {
      if (Array.isArray(imageUrl)) {
        imageUrl.forEach((url) => {
          if (url) {
            if (url.startsWith('http://') || url.startsWith('https://')) {
              userParts.push({
                fileData: {
                  mimeType: 'image/jpeg',
                  fileUri: url
                }
              });
            } else {
              let base64Data = url;
              if (base64Data.includes(';base64,')) {
                base64Data = base64Data.split(';base64,').pop();
              }
              userParts.push({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Data
                }
              });
            }
          }
        });
      } else {
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          userParts.push({
            fileData: {
              mimeType: 'image/jpeg',
              fileUri: imageUrl
            }
          });
        } else {
          let base64Data = imageUrl;
          if (base64Data.includes(';base64,')) {
            base64Data = base64Data.split(';base64,').pop();
          }
          userParts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          });
        }
      }
    }
    userParts.push({ text: userMessage });

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
        parts: userParts
      }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
