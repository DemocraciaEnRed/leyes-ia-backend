import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class GeminiFile extends Model {
    async isExpired() {
      if (!this.expirationTime) return false;
      return new Date() > this.expirationTime;
    }
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      GeminiFile.belongsTo(models.Project, {
        foreignKey: 'projectId',
        targetKey: 'id',
        as: 'project',
      });
    }
  }
  GeminiFile.init({
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,  
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true  
    },
    uri: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    state: {
      /**
       * STATE_UNSPECIFIED - The default value. This value is used if the state is omitted.
       * PROCESSING - File is being processed and cannot be used for inference yet.
       * ACTIVE - File is processed and available for inference.
       * FAILED - File failed processing.
       */
      type: DataTypes.STRING,
      allowNull: true
    },
    expirationTime: {
      type: DataTypes.DATE,
      allowNull: true,
      set(value) {
        // Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. 
        this.setDataValue('expirationTime', value ? new Date(value) : null);
      }
    },
    error: {
      type: DataTypes.JSON,
      allowNull: true
    },
    lastAPIResponse: {
      type: DataTypes.JSON,
      allowNull: true
    },
    lastAPIResponseAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
  }, {
    sequelize,
    timestamps: true,
    modelName: 'GeminiFile',
    tableName: 'GeminiFiles',
  });

  return GeminiFile;
};