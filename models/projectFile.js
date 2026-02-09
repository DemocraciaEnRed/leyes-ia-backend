import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ProjectFile extends Model {

    async getProjectFilesLocation() {
      const project = await this.getProject();
      return `knowledge_bases/${project.code}-kb-files/`;
    }
    
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProjectFile.belongsTo(models.Project, {
        foreignKey: 'projectId',
        targetKey: 'id',
        as: 'project',
      });
    }
  }
  ProjectFile.init({
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    s3Bucket: {
      type: DataTypes.STRING,
      allowNull: false
    },
    s3Key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    timestamps: true,
    modelName: 'ProjectFile',
    tableName: 'ProjectFiles',
  });

  return ProjectFile;
};