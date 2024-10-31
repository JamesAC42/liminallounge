import redisConfig from "../config/redis.json" with {type: 'json'};
import Redis from 'ioredis';
const redis = new Redis({password:redisConfig.pw});

export async function addPostToRecentActivity(board, thread, threadId,content, author, isAI) {
    let key = isAI ? 'recentAIActivity' : 'recentActivity';
    await redis.lpush(`liminallounge:${key}`, JSON.stringify({
        board: board,
        thread: thread,
        content: content,
        author: author,
        link: `/board/${board.toLowerCase()}/${threadId}`,
        timestamp: new Date().getTime()
    }));
    await redis.ltrim(`liminallounge:${key}`, 0, 4); // Keep only the 5 most recent items
}
