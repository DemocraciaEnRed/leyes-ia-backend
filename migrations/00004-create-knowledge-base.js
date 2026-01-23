import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('KnowledgeBases', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER
    },
    projectId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Projects',
        key: 'id'
      }
    },
    uuid: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    },
    name: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    },
    lastAPIResponse: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true
    },
    lastAPIResponseAt: {
      type: Sequelize.DataTypes.DATE,
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
    },
  }, {
    timestamps: true,
    updatedAt: true
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('KnowledgeBases');
}