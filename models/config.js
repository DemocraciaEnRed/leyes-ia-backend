import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class Config extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Config.init({
    key: DataTypes.STRING,
    type: DataTypes.STRING,
    value: DataTypes.TEXT
  }, {
    sequelize,
    timestamps: true,
    modelName: 'Config',
    tableName: 'Configs',
  });

  return Config;
};