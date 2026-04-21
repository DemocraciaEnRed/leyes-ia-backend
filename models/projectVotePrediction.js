import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ProjectVotePrediction extends Model {
    static associate(models) {
      ProjectVotePrediction.belongsTo(models.Project, {
        foreignKey: 'projectId',
        targetKey: 'id',
        as: 'project',
      });
      ProjectVotePrediction.belongsTo(models.PoliticalParty, {
        foreignKey: 'politicalPartyId',
        targetKey: 'id',
        as: 'politicalParty',
      });
      ProjectVotePrediction.belongsTo(models.User, {
        foreignKey: 'generatedByUserId',
        targetKey: 'id',
        as: 'generatedBy',
      });
    }
  }

  ProjectVotePrediction.init({
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    politicalPartyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    theoreticalVote: {
      type: DataTypes.ENUM('yes', 'no', 'abstain', 'divided'),
      allowNull: true,
    },
    theoreticalJustification: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    theoreticalSources: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    theoreticalConfidence: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contextualVote: {
      type: DataTypes.ENUM('yes', 'no', 'abstain', 'divided'),
      allowNull: true,
    },
    contextualJustification: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contextualSources: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    contextualConfidence: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contextualDateFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    contextualDateTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    contextualDiffersFromTheoretical: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    contextualReasonForDifference: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    generatedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
    },
  }, {
    sequelize,
    timestamps: true,
    modelName: 'ProjectVotePrediction',
    tableName: 'ProjectVotePredictions',
  });

  return ProjectVotePrediction;
};
