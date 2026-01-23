import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('GeminiFiles', {
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
    name: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    displayName: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    },
    uri: {
      type: Sequelize.DataTypes.STRING(512),
      allowNull: true
    },
    mimeType: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    },
    state: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    },
    expirationTime: {
      type: Sequelize.DataTypes.DATE,
      allowNull: true
    },
    error: {
      type: Sequelize.DataTypes.JSON,
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
  await queryInterface.dropTable('GeminiFiles');
}