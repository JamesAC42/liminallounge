import express from 'express';
import { Thread, Post, Board } from '../SQL/models.js';
import { checkRateLimit } from '../middleware/rateLimiter.js';
import { moderateContent } from '../middleware/contentModeration.js';
import { validateInput } from '../utils/inputValidation.js';

const router = express.Router();

async function getThread(req, res) {
    const { boardname, id } = req.params;

    try {
        const thread = await Thread.findOne({
            where: { id: parseInt(id) },
            include: [
                { 
                    model: Board,
                    where: { name: boardname }
                },
                { 
                    model: Post,
                    limit: 1,
                    order: [['time_posted', 'ASC']]
                }
            ]
        });

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // Format the thread data
        const formattedThread = {
            id: thread.id,
            title: thread.subject,
            board: thread.Board.name,
            preview: thread.Posts[0]?.content.substring(0, 100) + '...',
            createdAt: thread.Posts[0]?.time_posted,
            postCount: thread.posts,
            lastActivity: thread.last_activity
        };

        res.json(formattedThread);
    } catch (error) {
        console.error('Error fetching thread:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getThreadPosts(req, res) {
    const { boardname, id } = req.params;

    try {
        const thread = await Thread.findOne({
            where: { id: parseInt(id) },
            include: [
                { model: Board },
                { 
                    model: Post,
                    order: [['time_posted', 'ASC']]
                }
            ]
        });

        if (!thread || thread.Board.name.toLowerCase() !== boardname.toLowerCase()) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // Format the posts
        const formattedPosts = thread.Posts.map(post => ({
            id: post.id,
            content: post.content,
            author: post.name,
            createdAt: post.time_posted
        }));

        res.json(formattedPosts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createPost(req, res) {
    const { boardname, id } = req.params;
    const { content, author } = req.body;
    const MAX_REPLIES = 500;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Validate input
    const validation = validateInput(
        { content, author },
        {
            content: {
                maxLength: 2000,
                noWhitespace: true,
                preventXSS: true
            },
            author: {
                optional: true,
                maxLength: 100,
                noWhitespace: true,
                preventXSS: true
            }
        }
    );

    if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
    }

    try {
        // Check rate limit first
        try {
            await checkRateLimit(ip, 'post');
        } catch (error) {
            console.log(error);
            return res.status(429).json({ 
                error: error.message,
                remainingTime: parseInt(error.message.match(/\d+/)[0])
            });
        }

        const thread = await Thread.findOne({
            where: { id: parseInt(id) },
            include: 'Board'
        });

        if (!thread || thread.Board.name.toLowerCase() !== boardname.toLowerCase()) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // Check if thread has reached reply limit
        if (thread.posts >= MAX_REPLIES) {
            return res.status(403).json({ error: 'Thread has reached maximum reply limit' });
        }

        const newPost = await Post.create({
            thread: thread.id,
            content,
            time_posted: new Date().toISOString(),  // Store as ISO string
            name: author || 'Anonymous'
        });

        // Update thread's timestamp
        await thread.update({
            posts: thread.posts + 1,
            last_activity: new Date().toISOString()  // Store as ISO string
        });

        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Add routes
router.get('/:boardname/:id', getThread);
router.get('/:boardname/:id/posts', getThreadPosts);
router.post('/:boardname/:id/posts', moderateContent, createPost);

export default router;
