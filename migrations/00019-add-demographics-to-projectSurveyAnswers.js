import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('ProjectSurveyAnswers', 'userId', {
    type: Sequelize.DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  await queryInterface.addColumn('ProjectSurveyAnswers', 'dateOfBirth', {
    type: Sequelize.DataTypes.DATEONLY,
    allowNull: true,
  });

  await queryInterface.addColumn('ProjectSurveyAnswers', 'genre', {
    type: Sequelize.DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn('ProjectSurveyAnswers', 'provinceId', {
    type: Sequelize.DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Provinces',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  await queryInterface.addIndex('ProjectSurveyAnswers', ['projectSurveyId']);
  await queryInterface.addIndex('ProjectSurveyAnswers', ['userId']);
  await queryInterface.addIndex('ProjectSurveyAnswers', ['provinceId']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('ProjectSurveyAnswers', ['provinceId']);
  await queryInterface.removeIndex('ProjectSurveyAnswers', ['userId']);
  await queryInterface.removeIndex('ProjectSurveyAnswers', ['projectSurveyId']);

  await queryInterface.removeColumn('ProjectSurveyAnswers', 'provinceId');
  await queryInterface.removeColumn('ProjectSurveyAnswers', 'genre');
  await queryInterface.removeColumn('ProjectSurveyAnswers', 'dateOfBirth');
  await queryInterface.removeColumn('ProjectSurveyAnswers', 'userId');
}
