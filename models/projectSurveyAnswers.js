import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ProjectSurveyAnswer extends Model {


    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProjectSurveyAnswer.belongsTo(models.ProjectSurvey, {
        foreignKey: 'projectSurveyId',
        targetKey: 'id',
        as: 'projectSurvey',
      });

    }
  }
  ProjectSurveyAnswer.init({
    projectSurveyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    answers: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    timestamps: true,
    modelName: 'ProjectSurveyAnswer',
    tableName: 'ProjectSurveyAnswers',
  });

  return ProjectSurveyAnswer;
};