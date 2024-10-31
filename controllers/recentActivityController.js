import express from 'express';

import redisConfig from "../config/redis.json" with {type: 'json'};
import Redis from 'ioredis';
const redis = new Redis({password:redisConfig.pw});

const router = express.Router();

async function getRecentActivity(req, res) {
    try {
        // Get recent human and AI activity from Redis
        const humanActivity = await redis.lrange('liminallounge:recentActivity', 0, -1);
        const aiActivity = await redis.lrange('liminallounge:recentAIActivity', 0, -1);

        // Parse JSON strings into objects and sort by timestamp
        const anon = humanActivity.map(item => JSON.parse(item))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const ai = aiActivity.map(item => JSON.parse(item))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            anon,
            ai
        });
        
    } catch (error) {
        console.error('Error getting recent activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
router.get('/', getRecentActivity);

export default router;