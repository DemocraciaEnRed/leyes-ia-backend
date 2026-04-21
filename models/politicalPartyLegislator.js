import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class PoliticalPartyLegislator extends Model {
    static associate(models) {
      PoliticalPartyLegislator.belongsTo(models.PoliticalParty, {
        foreignKey: 'politicalPartyId',
        targetKey: 'id',
        as: 'politicalParty',
      });
      PoliticalPartyLegislator.belongsTo(models.Province, {
        foreignKey: 'provinceId',
        targetKey: 'id',
        as: 'province',
      });
    }
  }

  PoliticalPartyLegislator.init({
    politicalPartyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    chamber: {
      type: DataTypes.ENUM('senators', 'deputies'),
      allowNull: true,
    },
    provinceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active',
    },
  }, {
    sequelize,
    timestamps: true,
    modelName: 'PoliticalPartyLegislator',
    tableName: 'PoliticalPartyLegislators',
  });

  return PoliticalPartyLegislator;
};
