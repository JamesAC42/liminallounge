import { Sequelize } from 'sequelize';
import psqlLogin from '../config/psql.json' assert { type: 'json' };

const sequelize = new Sequelize(`postgres://${psqlLogin.username}:${psqlLogin.password}@localhost:5432/liminallounge`, {
    logging:false
});

export { sequelize };