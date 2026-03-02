import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  const columns = await queryInterface.describeTable('Projects');

  if (columns.featuredSurveyId) {
    return;
  }

  await queryInterface.addColumn('Projects', 'featuredSurveyId', {
    type: Sequelize.DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'ProjectSurveys',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export async function down({ context: queryInterface }) {
  const columns = await queryInterface.describeTable('Projects');

  if (!columns.featuredSurveyId) {
    return;
  }

  await queryInterface.removeColumn('Projects', 'featuredSurveyId');
}
