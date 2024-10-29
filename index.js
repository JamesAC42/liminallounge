import express from 'express';
import cors from 'cors';
import boardRoutes from './controllers/boardController.js';
import threadRoutes from './controllers/threadController.js';
import { Board } from './SQL/models.js';
import boardsData from './SQL/boards.json' assert { type: 'json' };

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize boards from JSON if they don't exist
const initializeBoards = async () => {
  try {
    for (const boardData of boardsData) {
      const [board, created] = await Board.findOrCreate({
        where: { name: boardData.name },
        defaults: {
          description: boardData.description
        }
      });
      
      if (created) {
        console.log(`Created board: ${boardData.name}`);
      }
    }
    console.log('Boards initialization complete');
  } catch (error) {
    console.error('Error initializing boards:', error);
  }
};

// Initialize boards when the server starts
initializeBoards();

// Routes
app.use('/api/boards', boardRoutes);
app.use('/api/threads', threadRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
