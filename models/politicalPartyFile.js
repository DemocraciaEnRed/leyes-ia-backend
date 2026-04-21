import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class PoliticalPartyFile extends Model {
    static associate(models) {
      PoliticalPartyFile.belongsTo(models.PoliticalParty, {
        foreignKey: 'politicalPartyId',
        targetKey: 'id',
        as: 'politicalParty',
      });
    }
  }

  PoliticalPartyFile.init({
    politicalPartyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    s3Bucket: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    s3Key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    timestamps: true,
    modelName: 'PoliticalPartyFile',
    tableName: 'PoliticalPartyFiles',
  });

  return PoliticalPartyFile;
};
