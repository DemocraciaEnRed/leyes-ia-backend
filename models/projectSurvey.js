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
    }
  }
  ProjectSurvey.init({
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    objective: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    targetAudience: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    requiredQuestions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    questions: {
      type: DataTypes.JSON,
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