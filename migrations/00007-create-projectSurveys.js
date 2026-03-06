import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('ProjectSurveys', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER
    },
    projectId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Projects',
        key: 'id'
      }
    },
    createdByUserId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    title: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    about: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: 'custom'
    },
    public: {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    allowAnonymousResponses: {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    visible: {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    welcomeTitle: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    welcomeDescription: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true
    },
    objective: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true
    },
    targetAudience: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true
    },
    context: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true
    },
    userInstructions: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true
    },
    requiredQuestions: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true
    },
    surveyJsonSchema: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true
    },
    questions: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true
    },
    responsesCount: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // date when the survey is closed
    closedAt: {
      type: Sequelize.DataTypes.DATE,
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

  await queryInterface.addConstraint('Projects', {
    fields: ['featuredSurveyId'],
    type: 'foreign key',
    name: 'projects_featuredSurveyId_fkey',
    references: {
      table: 'ProjectSurveys',
      field: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeConstraint('Projects', 'projects_featuredSurveyId_fkey');
  await queryInterface.dropTable('ProjectSurveys');
}
