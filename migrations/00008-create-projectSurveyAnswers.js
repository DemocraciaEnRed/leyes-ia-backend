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
    userId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    age: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    genre: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    provinceId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
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

  await queryInterface.addIndex('ProjectSurveyAnswers', ['projectSurveyId']);
  await queryInterface.addIndex('ProjectSurveyAnswers', ['userId']);
  await queryInterface.addIndex('ProjectSurveyAnswers', ['provinceId']);
  await queryInterface.addIndex('ProjectSurveyAnswers', ['age']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('ProjectSurveyAnswers');
}
