import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('ProjectVoteResults', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER,
    },
    projectId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Projects',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    voteDate: {
      type: Sequelize.DataTypes.DATEONLY,
      allowNull: false,
    },
    totalYes: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    totalNo: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    totalAbstain: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    sourceUrl: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    rawActaData: {
      type: Sequelize.DataTypes.JSON,
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
  await queryInterface.dropTable('ProjectVoteResults');
}
