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
      ProjectSurveyAnswer.belongsTo(models.User, {
        foreignKey: 'userId',
        targetKey: 'id',
        as: 'user',
      });
      ProjectSurveyAnswer.belongsTo(models.Province, {
        foreignKey: 'provinceId',
        targetKey: 'id',
        as: 'province',
      });

    }
  }
  ProjectSurveyAnswer.init({
    projectSurveyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    respondentData: {
      type: DataTypes.JSON,
      allowNull: true
    },
    answers: {
      type: DataTypes.JSON,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    genre: {
      type: DataTypes.STRING,
      allowNull: true
    },
    provinceId: {
      type: DataTypes.INTEGER,
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