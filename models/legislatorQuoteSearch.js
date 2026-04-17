import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class LegislatorQuoteSearch extends Model {
    static associate(models) {
      LegislatorQuoteSearch.belongsTo(models.Project, {
        foreignKey: 'projectId',
        targetKey: 'id',
        as: 'project',
      });

      LegislatorQuoteSearch.belongsTo(models.User, {
        foreignKey: 'userId',
        targetKey: 'id',
        as: 'user',
      });

      LegislatorQuoteSearch.belongsTo(models.Legislator, {
        foreignKey: 'legislatorId',
        targetKey: 'id',
        as: 'legislator',
      });
    }
  }

  LegislatorQuoteSearch.init(
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
      legislatorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dateRangeStart: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      dateRangeEnd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      result: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      stance: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      found: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      model: {
        type: DataTypes.STRING,
        allowNull: true,
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
      groundingSources: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      timestamps: true,
      modelName: 'LegislatorQuoteSearch',
      tableName: 'LegislatorQuoteSearches',
    },
  );

  return LegislatorQuoteSearch;
};
