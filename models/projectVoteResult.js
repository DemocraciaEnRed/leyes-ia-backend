import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ProjectVoteResult extends Model {
    static associate(models) {
      ProjectVoteResult.belongsTo(models.Project, {
        foreignKey: 'projectId',
        targetKey: 'id',
        as: 'project',
      });
      ProjectVoteResult.hasMany(models.ProjectVoteResultByParty, {
        foreignKey: 'projectVoteResultId',
        sourceKey: 'id',
        as: 'resultsByParty',
      });
    }
  }

  ProjectVoteResult.init({
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    voteDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    totalYes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalNo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalAbstain: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sourceUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rawActaData: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  }, {
    sequelize,
    timestamps: true,
    modelName: 'ProjectVoteResult',
    tableName: 'ProjectVoteResults',
  });

  return ProjectVoteResult;
};
