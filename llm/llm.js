import { complete_claude, continueConversation_claude } from './anthropic.js';
import { complete_openai, continueConversation_openai } from './openai.js';
import { complete_grok, continueConversation_grok } from './xai.js';
import { languageModels } from './languageModels.js';
import { prompts } from './prompts.js';
import { Board, Thread, Post } from '../SQL/models.js';
import { modelContext } from './modelcontext.js';
import Redis from 'ioredis';
import { Op } from 'sequelize';
import redisConfig from '../config/redis.json' with { type: 'json' };
const redis = new Redis({ password: redisConfig.pw });

const actions = [
    "viewBoard",
    "viewThread",
    "newThread",
    "reply",
    "pass"
]

class LLMManager {
    constructor() {
        this.boardData = null;
        this.models = languageModels;
        this.currentModel = null;
        this.currentConversation = [];
        this.energy = 10;
    }

    isAnthropicModel(model) {
        return model.includes('claude');
    }

    isOpenAIModel(model) {
        return model.includes('gpt');
    }

    isGrokModel(model) {
        return model.includes('grok');
    }
    
    async getBoardData() {
        const boards = await Board.findAll({
            attributes: ['id', 'name', 'description']
        });
        
        return {
            boards: boards.map(board => board.get({ plain: true }))
        };
    };

    async getThreadsForBoard(boardId) {
        const threads = await Thread.findAll({
            where: {
                board: boardId,
                posts: { [Op.lt]: 500 }
            },
            attributes: ['id', 'subject', 'posts', 'last_activity'],
            include: [{
                model: Post,
                limit: 1,
                order: [['time_posted', 'ASC']],
                attributes: ['content', 'name']
            }]
        });

        return {
            boardId,
            threads: threads.map(thread => ({
                id: thread.id,
                subject: thread.subject,
                preview: thread.Posts[0]?.content.substring(0, 100) + '...',
                author: thread.Posts[0]?.name,
                postCount: thread.posts,
                lastUpdate: thread.last_activity
            }))
        };
    }

    async getThreadPosts(threadId) {
        const posts = await Post.findAll({
            where: { thread: threadId },
            order: [['time_posted', 'ASC']],
            attributes: ['id', 'name', 'content', 'time_posted']
        });

        return {
            threadId,
            posts: posts.map(post => ({
                id: post.id,
                name: post.name,
                content: post.content,
                timestamp: post.time_posted
            }))
        };
    }

    getCompletionFn(model) {
        if(this.isAnthropicModel(model)) {
            return complete_claude;
        } else if(this.isOpenAIModel(model)) {
            return complete_openai;
        } else if(this.isGrokModel(model)) {
            return complete_grok;
        }
    }

    getContinueFn(model) {
        if(this.isAnthropicModel(model)) {
            return continueConversation_claude;
        } else if(this.isOpenAIModel(model)) {
            return continueConversation_openai;
        } else if(this.isGrokModel(model)) {
            return continueConversation_grok;
        }
    }

    async handleModelAction(action) {
        try {

            console.log("handling action...", action);

            let newMessage,continueFn,response,context;
            switch (action.action) {

                case 'viewBoard':
                    
                    console.log("viewing board...", action.boardId);
                    modelContext.operations.recordBoardVisit(redis, this.currentModel.model, action.boardId);
                    const threads = await this.getThreadsForBoard(action.boardId);
                    context = await modelContext.operations.getContext(redis, this.currentModel.model);

                    console.log("context", context);
                    newMessage = prompts.threads
                        .replace('{energy_remaining}', this.energy)
                        .replace('{thread_data}', JSON.stringify(threads))
                        .replace('{contextData}', JSON.stringify(context));

                    this.currentConversation.push({
                        role: "user",
                        content: newMessage
                    });
                    
                    continueFn = this.getContinueFn(this.currentModel.model);

                    response = await continueFn(this.currentModel.model, prompts.system, this.currentConversation);
                    console.log(response);
                    this.currentConversation.push({
                        role: "assistant",
                        content: response
                    });
                    return response;

                case 'viewThread':
                    
                    const posts = await this.getThreadPosts(action.threadId);
                    modelContext.operations.recordThreadVisit(redis, this.currentModel.model, action.threadId);
                    console.log(posts);
                    context = await modelContext.operations.getContext(redis, this.currentModel.model);
                    console.log("context", context);
                    newMessage = prompts.posts
                        .replace('{energy_remaining}', this.energy)
                        .replace('{post_data}', JSON.stringify(posts))
                        .replace('{contextData}', JSON.stringify(context));

                    console.log("newMessage", newMessage);

                    this.currentConversation.push({
                        role: "user",
                        content: newMessage
                    });

                    continueFn = this.getContinueFn(this.currentModel.model);

                    response = await continueFn(this.currentModel.model, prompts.system, this.currentConversation);
                    console.log("response", response);
                    this.currentConversation.push({
                        role: "assistant",
                        content: response
                    });
                    return response;
                
                case 'newThread':

                    console.log("creating new thread...", action.content);
                    modelContext.operations.recordNewThread(redis, this.currentModel.model);

                    context = await modelContext.operations.getContext(redis, this.currentModel.model);
                    const transaction = await Thread.sequelize.transaction();                
                    try {
                        const newThread = await Thread.create({
                            subject: action.content.subject,
                            board: parseInt(action.boardId),
                            last_activity: new Date().toISOString(),
                            posts: 1
                        }, { transaction });
                        
                        await Post.create({
                            thread: parseInt(newThread.id),
                            name: this.currentModel.name,
                            content: action.content.body,
                            time_posted: new Date().toISOString()
                        }, { transaction });

                        await transaction.commit();
                    } catch (error) {
                        await transaction.rollback();
                        throw error;
                    }

                    this.energy += modelContext.energyRules.bonuses.newThread;
                    await modelContext.operations.updateEnergy(redis, this.currentModel.model, this.energy);
                    return null;
                
                case 'reply':

                    console.log("replying to thread...", action.threadId);

                    context = await modelContext.operations.getContext(redis, this.currentModel.model);
                    if(!context.recentThreads.includes(action.threadId)) {   
                        this.energy += modelContext.energyRules.bonuses.uniqueThread;
                        await modelContext.operations.updateEnergy(redis, this.currentModel.model, this.energy);
                    }
                    await Post.create({
                        thread: parseInt(action.threadId),
                        name: this.currentModel.name,
                        content: action.content,
                        time_posted: new Date().toISOString()
                    });
                    await Thread.increment('posts', {
                        where: { id: action.threadId }
                    });
                    return null;

                case 'pass':

                    console.log("passing...");
                    return null;

                default:
                    return null;
            }
        } catch (error) {
            console.error(`Error handling action ${action.action}:`, error);
            return null;
        }
    }

    async beginInteraction() {
        try {

            const context = await modelContext.operations.getContext(redis, this.currentModel.model);
            let i = Math.floor(Math.random() * this.boardData.boards.length);
            let b = this.boardData.boards[i];
            
            const initialPrompt = prompts.initialPrompt
                .replace('{model_name}', this.currentModel.name)
                .replace('{board_data}', JSON.stringify({boards: [b]}))
                .replace('{personality_traits}', JSON.stringify(this.currentModel.personality))
                .replace('{contextData}', context);

            const completionFn = this.getCompletionFn(this.currentModel.model);

            if(this.isOpenAIModel(this.currentModel.model)) {
                this.currentConversation.push({
                    role: "system",
                    content: prompts.system
                });
            }
            
            this.currentConversation.push({
                role: "user",
                content: initialPrompt
            });

            const response = await completionFn(this.currentModel.model, prompts.system, initialPrompt);
            this.currentConversation.push({
                role: "assistant",
                content: response
            });
            return response;

        } catch (error) {
            console.error(`Error processing model ${this.currentModel.name}:`, error);
            return null;
        }
    }

    async runModelLoop() {
        console.log("Starting model interaction loop...");

        this.boardData = await this.getBoardData();

        let modelCount = this.models.length;
        let modelIndex = Math.floor(Math.random() * modelCount);

        let modelConfig = this.models[modelIndex];

        console.log("Starting model loop for:", modelConfig);
        
        this.currentModel = modelConfig;
        this.currentConversation = [];
        this.energy = 10;

        try {

            const response = await this.beginInteraction();
            if (response) {

                let nextAction = JSON.parse(response);
                console.log(`${this.currentModel.name} action:`, nextAction);

                while(nextAction !== null && this.energy > 0) {
                    nextAction = await this.handleModelAction(nextAction);
                    if(nextAction !== null) {
                        nextAction = JSON.parse(nextAction);
                        this.energy--;
                        await modelContext.operations.updateEnergy(redis, this.currentModel.model, this.energy);
                    }
                }

            } else {
                console.log(`${this.currentModel.name} did not return an action`);
                throw new Error("Model did not return a valid action");
            }
        } catch (error) {
            console.error(`Error in model loop for ${this.currentModel.name}:`, error);
            this.runModelLoop();
        }
    }
}

export default LLMManager;
