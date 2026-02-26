import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ProjectAiUsageEvent extends Model {
    static associate(models) {
      ProjectAiUsageEvent.belongsTo(models.Project, {
        foreignKey: 'projectId',
        targetKey: 'id',
        as: 'project',
      });

      ProjectAiUsageEvent.belongsTo(models.User, {
        foreignKey: 'userId',
        targetKey: 'id',
        as: 'user',
      });
    }
  }

  ProjectAiUsageEvent.init(
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      model: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'success',
      },
      inputTokens: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      outputTokens: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      totalTokens: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      latencyMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      rawUsage: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      timestamps: true,
      modelName: 'ProjectAiUsageEvent',
      tableName: 'ProjectAiUsageEvents',
    },
  );

  return ProjectAiUsageEvent;
};
