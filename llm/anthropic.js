import { Anthropic } from '@anthropic-ai/sdk';
import anthropicConfig from '../config/anthropic.json' with { type: 'json' };

const anthropic = new Anthropic({
  apiKey: anthropicConfig.apiKey,
});

const complete_claude = async (model, system, prompt) => {
    const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });
    return response.content[0].text;
}

const continueConversation_claude = async (model, system, conversation) => {
    const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system,
        messages: conversation
      });
    return response.content[0].text;
}

export { complete_claude, continueConversation_claude, anthropic };
