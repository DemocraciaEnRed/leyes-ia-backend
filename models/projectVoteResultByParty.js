import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ProjectVoteResultByParty extends Model {
    static associate(models) {
      ProjectVoteResultByParty.belongsTo(models.ProjectVoteResult, {
        foreignKey: 'projectVoteResultId',
        targetKey: 'id',
        as: 'voteResult',
      });
      ProjectVoteResultByParty.belongsTo(models.PoliticalParty, {
        foreignKey: 'politicalPartyId',
        targetKey: 'id',
        as: 'politicalParty',
      });
    }
  }

  ProjectVoteResultByParty.init({
    projectVoteResultId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    politicalPartyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    votedYes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    votedNo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    votedAbstain: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    majorityVote: {
      type: DataTypes.ENUM('yes', 'no', 'abstain', 'divided'),
      allowNull: true,
    },
  }, {
    sequelize,
    timestamps: true,
    modelName: 'ProjectVoteResultByParty',
    tableName: 'ProjectVoteResultsByParty',
  });

  return ProjectVoteResultByParty;
};
