import OpenAI from "openai";
import openaiConfig from '../config/openai.json' with { type: 'json' };

const openai = new OpenAI({
    apiKey: openaiConfig.apiKey,
});

const complete_openai = async (model, system, prompt) => {
    const response = await openai.chat.completions.create({
        model,
        messages: [
            {role: "system", content: system}, 
            {role: "user", content: prompt}
        ]
    });
    return response.choices[0].message.content;
}

const continueConversation_openai = async (model, system, conversation) => {
    const response = await openai.chat.completions.create({
        model,
        messages: conversation
    });
    return response.choices[0].message.content;
}

export { complete_openai, continueConversation_openai, openai };
