import express from 'express';
import { Board, Thread, Post } from '../SQL/models.js';
import { sequelize } from '../SQL/database.js';
import { checkRateLimit } from '../middleware/rateLimiter.js';
import { moderateContent } from '../middleware/contentModeration.js';
import { validateInput } from '../utils/inputValidation.js';

const router = express.Router();

async function getAllBoards(req, res) {
    try {
        const boards = await Board.findAll({
            attributes: ['id', 'name', 'description'],
            order: [['name', 'ASC']]
        });

        if (!boards) {
            return res.status(404).json({ error: 'No boards found' });
        }

        res.json(boards);
    } catch (error) {
        console.error('Error fetching boards:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getThreadsInBoard(req, res) {
    const { boardname } = req.params;
    
    try {
        const board = await Board.findOne({
            where: { name: boardname }
        });

        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        // Get threads separately to ensure proper ordering
        const threads = await Thread.findAll({
            where: { board: board.id },
            include: [{
                model: Post,
                limit: 1,
                order: [['time_posted', 'ASC']]
            }],
            order: [['last_activity', 'DESC']] // This will now properly order threads
        });

        // Format the threads data
        const formattedThreads = threads.map(thread => ({
            id: thread.id,
            title: thread.subject,
            preview: thread.Posts[0]?.content.substring(0, 100) + '...',
            postCount: thread.posts,
            lastActivity: thread.last_activity
        }));

        res.json(formattedThreads);
    } catch (error) {
        console.error('Error fetching threads:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createThread(req, res) {
    const { boardname } = req.params;
    const { title, content, author } = req.body;
    const THREAD_LIMIT = 50;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Validate input
    const validation = validateInput(
        { title, content, author },
        {
            title: {
                maxLength: 100,
                noWhitespace: true,
                preventXSS: true
            },
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
            await checkRateLimit(ip, 'thread');
        } catch (error) {
            return res.status(429).json({ 
                error: error.message,
                remainingTime: parseInt(error.message.match(/\d+/)[0])
            });
        }

        const t = await sequelize.transaction();

        const board = await Board.findOne({
            where: { name: boardname }
        });

        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        // Count existing threads in the board
        const threadCount = await Thread.count({
            where: { board: board.id }
        });

        // If we've hit the thread limit, delete the oldest thread
        if (threadCount >= THREAD_LIMIT) {
            // Find the thread with the oldest last_activity
            const oldestThread = await Thread.findOne({
                where: { board: board.id },
                order: [['last_activity', 'ASC']],
                transaction: t
            });

            if (oldestThread) {
                // Delete all posts in the thread
                await Post.destroy({
                    where: { thread: oldestThread.id },
                    transaction: t
                });

                // Delete the thread itself
                await oldestThread.destroy({ transaction: t });
            }
        }

        // Create the new thread
        const newThread = await Thread.create({
            subject: title,
            posts: 1,
            last_activity: new Date().toISOString(),  // Store as ISO string
            board: board.id
        }, { transaction: t });

        // Create the first post with ISO timestamp
        await Post.create({
            thread: newThread.id,
            content: content,
            time_posted: new Date().toISOString(),  // Store as ISO string
            name: author || 'Anonymous'
        }, { transaction: t });

        await t.commit();
        res.status(201).json(newThread);
    } catch (error) {
        await t.rollback();
        console.error('Error creating thread:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Add routes
router.get('/', getAllBoards);
router.get('/:boardname/threads', getThreadsInBoard);
router.post('/:boardname/threads', moderateContent, createThread);

export default router;
