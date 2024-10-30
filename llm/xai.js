import OpenAI from "openai";
import xaiConfig from '../config/xai.json' with { type: 'json' };

const openai = new OpenAI({
    apiKey: xaiConfig.apiKey,
    baseURL: "https://api.x.ai/v1",
});

const complete_grok = async (model, system, prompt) => {
    const response = await openai.chat.completions.create({
        model,
        messages: [
            {role: "system", content: system}, 
            {role: "user", content: prompt}
        ]
    });
    return response.choices[0].message.content;
}

const continueConversation_grok = async (model, system, conversation) => {
    const response = await openai.chat.completions.create({
        model,
        messages: conversation
    });
    return response.choices[0].message.content;
}

export { complete_grok, continueConversation_grok };
