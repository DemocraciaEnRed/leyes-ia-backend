import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('ProjectVotePredictions', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER,
    },
    projectId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Projects',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    politicalPartyId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'PoliticalParties',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    theoreticalVote: {
      type: Sequelize.DataTypes.ENUM('yes', 'no', 'abstain', 'divided'),
      allowNull: true,
    },
    theoreticalJustification: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true,
    },
    theoreticalSources: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    },
    theoreticalConfidence: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    contextualVote: {
      type: Sequelize.DataTypes.ENUM('yes', 'no', 'abstain', 'divided'),
      allowNull: true,
    },
    contextualJustification: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true,
    },
    contextualSources: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    },
    contextualConfidence: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    contextualDateFrom: {
      type: Sequelize.DataTypes.DATEONLY,
      allowNull: true,
    },
    contextualDateTo: {
      type: Sequelize.DataTypes.DATEONLY,
      allowNull: true,
    },
    contextualDiffersFromTheoretical: {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: true,
    },
    contextualReasonForDifference: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true,
    },
    generatedAt: {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    },
    generatedByUserId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    status: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
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
  });

  await queryInterface.addConstraint('ProjectVotePredictions', {
    fields: ['projectId', 'politicalPartyId'],
    type: 'unique',
    name: 'project_vote_predictions_project_party_unique',
  });

  await queryInterface.addIndex('ProjectVotePredictions', ['projectId'], {
    name: 'project_vote_predictions_projectId_idx',
  });

  await queryInterface.addIndex('ProjectVotePredictions', ['politicalPartyId'], {
    name: 'project_vote_predictions_politicalPartyId_idx',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('ProjectVotePredictions');
}
