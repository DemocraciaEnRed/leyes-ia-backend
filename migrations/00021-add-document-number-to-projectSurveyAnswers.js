import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('ProjectSurveyAnswers', 'documentNumber', {
    type: Sequelize.DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addIndex('ProjectSurveyAnswers', ['documentNumber']);
  await queryInterface.addIndex('ProjectSurveyAnswers', ['projectSurveyId', 'documentNumber']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('ProjectSurveyAnswers', ['projectSurveyId', 'documentNumber']);
  await queryInterface.removeIndex('ProjectSurveyAnswers', ['documentNumber']);
  await queryInterface.removeColumn('ProjectSurveyAnswers', 'documentNumber');
}
