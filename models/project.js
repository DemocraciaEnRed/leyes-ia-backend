import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  
  class Project extends Model {
    async getMainFile() {
      const pdfFilename = `${this.code}-project.pdf`;
      const projectFiles = await sequelize.models.ProjectFile.findOne({
        where: {
          projectId: this.id,
          name: pdfFilename
        }
      })
      return projectFiles;
    }
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Project.hasOne(models.KnowledgeBase, {
        foreignKey: 'projectId',
        sourceKey: 'id',
        as: 'knowledgeBase',
      });
      Project.hasMany(models.ProjectFile, {
        foreignKey: 'projectId',
        sourceKey: 'id',
        as: 'projectFiles',
      });
      Project.hasMany(models.ProjectSurvey, {
        foreignKey: 'projectId',
        sourceKey: 'id',
        as: 'projectSurveys',
      });
      Project.hasOne(models.GeminiFile, {
        foreignKey: 'projectId',
        sourceKey: 'id',
        as: 'geminiFile',
      });
    }
  }
  Project.init({
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: true
    },
    authorFullname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    content: {
      type: DataTypes.JSON,
      allowNull: true
    },
    proposed_questions:{ 
      type: DataTypes.JSON,
      allowNull: true
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
  }, {
    sequelize,
    timestamps: true,
    modelName: 'Project',
    tableName: 'Projects',
  });

  return Project;
};