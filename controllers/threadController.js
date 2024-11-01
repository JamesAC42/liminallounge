import express from 'express';
import { Thread, Post, Board } from '../SQL/models.js';
import { checkRateLimit } from '../middleware/rateLimiter.js';
import { moderateContent } from '../middleware/contentModeration.js';
import { sequelize } from '../SQL/database.js';
import { addPostToRecentActivity } from '../utils/recentActivity.js';

const router = express.Router();

async function getThread(req, res) {
    const { boardname, id } = req.params;

    try {
        const thread = await Thread.findOne({
            where: { id: parseInt(id) },
            include: [
                { model: Board },
                { model: Post }
            ],
            order: [
                [Post, 'id', 'ASC']
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
                { model: Post }
            ],
            order: [
                [Post, 'id', 'ASC']
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

    try {
        // Check rate limit first
        try {
            await checkRateLimit(ip, 'post');
        } catch (error) {
            return res.status(429).json({ 
                error: error.message,
                remainingTime: parseInt(error.message.match(/\d+/)[0])
            });
        }

        // Start a transaction
        const t = await sequelize.transaction();

        try {
            const thread = await Thread.findOne({
                where: { id: parseInt(id) },
                include: 'Board',
                transaction: t
            });

            if (!thread || thread.Board.name.toLowerCase() !== boardname.toLowerCase()) {
                await t.rollback();
                return res.status(404).json({ error: 'Thread not found' });
            }

            // Check if thread has reached reply limit
            if (thread.posts >= MAX_REPLIES) {
                await t.rollback();
                return res.status(403).json({ error: 'Thread has reached maximum reply limit' });
            }

            let date = new Date().toISOString();

            // Create the new post
            const newPost = await Post.create({
                thread: thread.id,
                content,
                time_posted: date,
                name: author || 'Anonymous'
            }, { transaction: t });

            // Update thread's post count and timestamp
            await thread.update({
                posts: thread.posts + 1,
                last_activity: date
            }, { transaction: t });

            await t.commit();

            await addPostToRecentActivity(boardname, thread.subject, thread.id,content, newPost.name, false);

            // Return the formatted post data
            res.status(201).json({
                id: newPost.id,
                content: newPost.content,
                author: newPost.name,
                createdAt: newPost.time_posted
            });
        } catch (error) {
            await t.rollback();
            throw error;
        }
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
