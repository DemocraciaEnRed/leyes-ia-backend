import { Model } from 'sequelize';

const SUMMARY_REQUIRED_FIELDS = [
  'title',
  'category',
  'description',
  'summary',
  'content',
  'proposed_questions',
];

const isValueMissing = (value) => {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0 || value.every((item) => isValueMissing(item));
  }

  if (typeof value === 'object') {
    const values = Object.values(value);
    return values.length === 0 || values.every((item) => isValueMissing(item));
  }

  return false;
};

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
      Project.belongsTo(models.User, {
        foreignKey: 'projectOwnerId',
        targetKey: 'id',
        as: 'owner',
      });
      Project.belongsToMany(models.User, {
        through: models.ProjectMember,
        foreignKey: 'projectId',
        otherKey: 'userId',
        as: 'members',
      });
      Project.hasMany(models.ProjectMember, {
        foreignKey: 'projectId',
        sourceKey: 'id',
        as: 'projectMembers',
      });
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
      Project.belongsTo(models.ProjectSurvey, {
        foreignKey: 'featuredSurveyId',
        targetKey: 'id',
        as: 'featuredSurvey',
      });
      Project.hasMany(models.ProjectAiUsageEvent, {
        foreignKey: 'projectId',
        sourceKey: 'id',
        as: 'projectAiUsageEvents',
      });
      Project.hasOne(models.GeminiFile, {
        foreignKey: 'projectId',
        sourceKey: 'id',
        as: 'geminiFile',
      });
    }
  }
  Project.init({
    projectOwnerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
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
    featuredSurveyId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    summaryIncompleteFields: {
      type: DataTypes.VIRTUAL,
      get() {
        return SUMMARY_REQUIRED_FIELDS.filter((field) => isValueMissing(this.getDataValue(field)));
      }
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