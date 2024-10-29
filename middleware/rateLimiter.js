import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const COOLDOWN_SECONDS = 10; // 1 minute cooldown

export async function checkRateLimit(ip, action) {
    const key = `liminallounge:${action}:${ip}`;

    console.log(key);
    
    const lastActionTime = await redis.get(key);
    if (lastActionTime) {
        const timeElapsed = Math.floor(Date.now() / 1000) - parseInt(lastActionTime);
        if (timeElapsed < COOLDOWN_SECONDS) {
            const remainingTime = COOLDOWN_SECONDS - timeElapsed;
            throw new Error(`Please wait ${remainingTime} seconds before ${action === 'post' ? 'posting' : 'creating a thread'} again`);
        }
    }

    console.log(lastActionTime);
    
    await redis.set(key, Math.floor(Date.now() / 1000));
    await redis.expire(key, COOLDOWN_SECONDS);
}
