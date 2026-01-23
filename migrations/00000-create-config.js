import {Sequelize} from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('Configs', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER
    },
      key: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false
      },
      value: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.fn('now'),
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.fn('now'),
        allowNull: false,
      }
    });
  await queryInterface.bulkInsert('Configs', [
    { key: 'tos', type: 'string', value: 'Próximamente' },
    { key: 'privacy', type: 'string', value: 'Próximamente' },
  ]);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('Configs');
}