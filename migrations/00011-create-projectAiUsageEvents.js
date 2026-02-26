import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('ProjectAiUsageEvents', {
    id: {
      type: Sequelize.DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.DataTypes.UUIDV4,
    },
    projectId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Projects',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    userId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    action: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: 'success',
    },
    inputTokens: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    outputTokens: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    totalTokens: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    latencyMs: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    errorMessage: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    },
    rawUsage: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('now'),
    },
    updatedAt: {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('now'),
    },
  }, {
    timestamps: true,
    updatedAt: true,
  });

  await queryInterface.addIndex('ProjectAiUsageEvents', ['projectId']);
  await queryInterface.addIndex('ProjectAiUsageEvents', ['userId']);
  await queryInterface.addIndex('ProjectAiUsageEvents', ['action']);
  await queryInterface.addIndex('ProjectAiUsageEvents', ['model']);
  await queryInterface.addIndex('ProjectAiUsageEvents', ['status']);
  await queryInterface.addIndex('ProjectAiUsageEvents', ['createdAt']);
  await queryInterface.addIndex('ProjectAiUsageEvents', ['projectId', 'createdAt']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('ProjectAiUsageEvents');
}
