import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('ProjectSurveyAnswers', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER
    },
    projectSurveyId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ProjectSurveys',
        key: 'id'
      }
    },
    respondentData: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true
    },
    answers: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true
    },
    createdAt: {
      type: Sequelize.DataTypes.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DataTypes.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false,
    },
  }, {
    timestamps: true,
    updatedAt: true
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('ProjectSurveyAnswers');
}
