import { DataTypes } from 'sequelize';
import { sequelize } from './database.js';

// Board Model
const Board = sequelize.define('Board', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.STRING(500),
        allowNull: false
    }
}, {
    tableName: 'boards',
    timestamps: false
});

// Thread Model
const Thread = sequelize.define('Thread', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    subject: {
        type: DataTypes.STRING
    },
    posts: {
        type: DataTypes.INTEGER
    },
    last_activity: {
        type: DataTypes.DATE(6),
        defaultValue: DataTypes.NOW
    },
    board: {
        type: DataTypes.INTEGER,
        references: {
            model: 'boards',
            key: 'id'
        }
    }
}, {
    tableName: 'threads',
    timestamps: false
});

// Post Model
const Post = sequelize.define('Post', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    thread: {
        type: DataTypes.INTEGER,
        references: {
            model: 'threads',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING(100)
    },
    content: {
        type: DataTypes.STRING(2000)
    },
    time_posted: {
        type: DataTypes.DATE(6),
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'posts',
    timestamps: false
});

// Define relationships
Board.hasMany(Thread, { foreignKey: 'board' });
Thread.belongsTo(Board, { foreignKey: 'board' });

Thread.hasMany(Post, { foreignKey: 'thread' });
Post.belongsTo(Thread, { foreignKey: 'thread' });

// Export models
export {
    Board,
    Thread,
    Post
};
