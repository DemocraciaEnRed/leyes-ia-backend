import { Sequelize } from 'sequelize'

const hasIndexByFields = (indexes, fields) => {
  const expected = [...fields].sort().join(',');

  return indexes.some((index) => {
    const indexFields = Array.isArray(index?.fields)
      ? index.fields.map(field => field?.attribute).filter(Boolean).sort().join(',')
      : '';

    return indexFields === expected;
  });
};

export async function up({ context: queryInterface }) {
  const tableDescription = await queryInterface.describeTable('ProjectSurveyAnswers');
  const indexes = await queryInterface.showIndex('ProjectSurveyAnswers');

  if (!tableDescription.age) {
    await queryInterface.addColumn('ProjectSurveyAnswers', 'age', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    });
  }

  if (!hasIndexByFields(indexes, ['age'])) {
    await queryInterface.addIndex('ProjectSurveyAnswers', ['age']);
  }

  if (tableDescription.documentNumber) {
    if (hasIndexByFields(indexes, ['projectSurveyId', 'documentNumber'])) {
      await queryInterface.removeIndex('ProjectSurveyAnswers', ['projectSurveyId', 'documentNumber']);
    }

    if (hasIndexByFields(indexes, ['documentNumber'])) {
      await queryInterface.removeIndex('ProjectSurveyAnswers', ['documentNumber']);
    }

    await queryInterface.sequelize.query('ALTER TABLE `ProjectSurveyAnswers` DROP COLUMN `documentNumber`;');
  }

  if (tableDescription.dateOfBirth) {
    await queryInterface.sequelize.query('ALTER TABLE `ProjectSurveyAnswers` DROP COLUMN `dateOfBirth`;');
  }
}

export async function down({ context: queryInterface }) {
  const tableDescription = await queryInterface.describeTable('ProjectSurveyAnswers');
  const indexes = await queryInterface.showIndex('ProjectSurveyAnswers');

  if (!tableDescription.dateOfBirth) {
    await queryInterface.addColumn('ProjectSurveyAnswers', 'dateOfBirth', {
      type: Sequelize.DataTypes.DATEONLY,
      allowNull: true,
    });
  }

  if (!tableDescription.documentNumber) {
    await queryInterface.addColumn('ProjectSurveyAnswers', 'documentNumber', {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    });
  }

  if (!hasIndexByFields(indexes, ['documentNumber'])) {
    await queryInterface.addIndex('ProjectSurveyAnswers', ['documentNumber']);
  }

  if (!hasIndexByFields(indexes, ['projectSurveyId', 'documentNumber'])) {
    await queryInterface.addIndex('ProjectSurveyAnswers', ['projectSurveyId', 'documentNumber']);
  }

  if (hasIndexByFields(indexes, ['age'])) {
    await queryInterface.removeIndex('ProjectSurveyAnswers', ['age']);
  }

  if (tableDescription.age) {
    await queryInterface.sequelize.query('ALTER TABLE `ProjectSurveyAnswers` DROP COLUMN `age`;');
  }
}
