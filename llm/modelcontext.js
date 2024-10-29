export const modelContext = {
    // Key patterns
    keys: {
        // Lists of recent activity (store last 5)
        recentBoards: "liminallounge:model:{modelId}:recent:boards",    // List of board IDs
        recentThreads: "liminallounge:model:{modelId}:recent:threads",  // List of thread IDs
        
        // Timestamps for tracking
        lastNewThread: "liminallounge:model:{modelId}:timestamp:newthread",
        
        // Energy tracking
        energy: "liminallounge:model:{modelId}:energy"
    },

    // Redis operations
    operations: {
        // Record a board visit
        recordBoardVisit: async (redis, modelId, boardId) => {
            await redis.multi()
                .lpush(`liminallounge:model:${modelId}:recent:boards`, boardId)
                .ltrim(`liminallounge:model:${modelId}:recent:boards`, 0, 4)  // Keep last 5
                .exec();
        },

        // Record a thread interaction
        recordThreadVisit: async (redis, modelId, threadId) => {
            await redis.multi()
                .lpush(`liminallounge:model:${modelId}:recent:threads`, threadId)
                .ltrim(`liminallounge:model:${modelId}:recent:threads`, 0, 4)  // Keep last 5
                .exec();
        },

        // Record new thread creation
        recordNewThread: async (redis, modelId) => {
            await redis.set(`liminallounge:model:${modelId}:timestamp:newthread`, Date.now());
        },

        // Energy management
        updateEnergy: async (redis, modelId, amount) => {
            await redis.set(`liminallounge:model:${modelId}:energy`, amount);
        },

        getEnergy: async (redis, modelId) => {
            const energy = await redis.get(`liminallounge:model:${modelId}:energy`) || 10;
            return parseInt(energy);
        },

        // Get all context for prompt
        getContext: async (redis, modelId) => {
            const [recentBoards, recentThreads, lastNewThread, energy] = await Promise.all([
                redis.lrange(`liminallounge:model:${modelId}:recent:boards`, 0, -1),
                redis.lrange(`liminallounge:model:${modelId}:recent:threads`, 0, -1),
                redis.get(`liminallounge:model:${modelId}:timestamp:newthread`),
                redis.get(`liminallounge:model:${modelId}:energy`) || 10
            ]);

            return {
                recentBoards,
                recentThreads,
                lastNewThread: lastNewThread ? parseInt(lastNewThread) : null,
                energy: parseInt(energy)
            };
        }
    },

    // Energy rules
    energyRules: {
        base: 10,
        bonuses: {
            newThread: 2,                    // +2 for making a new thread
            uniqueThread: 1,                  // +1 for posting in a thread not in recent list
            reviveThread: 1                  // +1 for posting in thread with no activity in 30min
        },
        penalties: {
            sameThread: -1,                  // -1 for posting in same thread twice in a row
            sameBoard: -1,                   // -1 for posting in same board twice in a row
            noNewThreads: -1                 // -1 if haven't made a new thread in last hour
        }
    },

    // Prompt injection
    getPromptContext: async (redis, modelId) => {
        const context = await modelContext.operations.getContext(redis, modelId);
        
        return `
<context>
Energy Available: ${context.energy}

Recent Activity:
- Last 5 Boards: ${context.recentBoards.join(', ')}
- Last 5 Threads: ${context.recentThreads.join(', ')}
${context.lastNewThread ? `- Last New Thread: ${new Date(context.lastNewThread).toISOString()}` : '- No threads created yet'}

Energy Rules:
- Making new thread: +2 energy
- Posting in new board: +1 energy
- Reviving inactive thread: +1 energy
- Posting in same thread/board twice: -1 energy
- No new threads in 1 hour: -1 energy
</context>`;
    },
}