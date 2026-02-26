import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class SystemLog extends Model {
    static associate(models) {
      SystemLog.belongsTo(models.User, {
        foreignKey: 'performedBy',
        targetKey: 'id',
        as: 'performedByUser',
      });
    }
  }

  SystemLog.init(
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      performedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'performed_by',
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    },
    {
      sequelize,
      timestamps: true,
      updatedAt: false,
      modelName: 'SystemLog',
      tableName: 'SystemLogs',
      underscored: true,
    },
  );

  return SystemLog;
};
