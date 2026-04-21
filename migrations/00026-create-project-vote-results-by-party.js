import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('ProjectVoteResultsByParty', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER,
    },
    projectVoteResultId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ProjectVoteResults',
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
    votedYes: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    votedNo: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    votedAbstain: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    majorityVote: {
      type: Sequelize.DataTypes.ENUM('yes', 'no', 'abstain', 'divided'),
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
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('ProjectVoteResultsByParty');
}
