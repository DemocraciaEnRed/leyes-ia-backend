import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class PoliticalParty extends Model {
    static associate(models) {
      PoliticalParty.hasMany(models.PoliticalPartyFile, {
        foreignKey: 'politicalPartyId',
        sourceKey: 'id',
        as: 'files',
      });
      PoliticalParty.hasMany(models.PoliticalPartyLegislator, {
        foreignKey: 'politicalPartyId',
        sourceKey: 'id',
        as: 'partyLegislators',
      });
      PoliticalParty.hasMany(models.ProjectVotePrediction, {
        foreignKey: 'politicalPartyId',
        sourceKey: 'id',
        as: 'votePredictions',
      });
      PoliticalParty.hasMany(models.Legislator, {
        foreignKey: 'politicalPartyId',
        sourceKey: 'id',
        as: 'legislators',
      });
    }
  }

  PoliticalParty.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    shortName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profileSummary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    profileExpandedWithSearch: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    profileGeneratedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'draft',
    },
  }, {
    sequelize,
    timestamps: true,
    modelName: 'PoliticalParty',
    tableName: 'PoliticalParties',
  });

  return PoliticalParty;
};
