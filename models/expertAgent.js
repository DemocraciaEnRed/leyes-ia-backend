import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ExpertAgent extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ExpertAgent.init({
    uuid: {
      type: DataTypes.STRING,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bearerToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
  }, {
    sequelize,
    timestamps: true,
    modelName: 'ExpertAgent',
    tableName: 'ExpertAgents',
    defaultScope: {
      attributes: {
        exclude: ['bearerToken'] // Excludes these fields by default
      }
    }
  });

  return ExpertAgent;
};