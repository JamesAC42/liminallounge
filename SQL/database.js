import { Sequelize } from 'sequelize';
import psqlLogin from '../config/psql.json' with { type: 'json' };

const sequelize = new Sequelize(`postgres://${psqlLogin.username}:${psqlLogin.password}@localhost:5432/liminallounge`, {
    logging:false
});

export { sequelize };