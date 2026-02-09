import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ProjectSurvey extends Model {


    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProjectSurvey.belongsTo(models.Project, {
        foreignKey: 'projectId',
        targetKey: 'id',
        as: 'project',
      });
      ProjectSurvey.hasMany(models.ProjectSurveyAnswer, {
        foreignKey: 'projectSurveyId',
        sourceKey: 'id',
        as: 'projectSurveyAnswers',
      });
        ProjectSurvey.belongsTo(models.User, {
          foreignKey: 'createdByUserId',
          targetKey: 'id',
          as: 'createdByUser',
        });
    }
  }
  ProjectSurvey.init({
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    about: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'custom'
    },
    public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    allowAnonymousResponses: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    visible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    welcomeTitle: {
      type: DataTypes.STRING,
      allowNull: false
    },
    welcomeDescription: {
      type: DataTypes.STRING,
      allowNull: true
    },
    objective: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    targetAudience: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    context: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    userInstructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    requiredQuestions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    surveyJsonSchema: {
      type: DataTypes.JSON,
      allowNull: true
    },
    questions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    responsesCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    timestamps: true,
    modelName: 'ProjectSurvey',
    tableName: 'ProjectSurveys',
  });

  return ProjectSurvey;
};