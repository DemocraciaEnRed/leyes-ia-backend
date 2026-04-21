import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('PoliticalParties', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER,
    },
    name: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    shortName: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    logoUrl: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    profileSummary: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true,
    },
    profileExpandedWithSearch: {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    profileGeneratedAt: {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: 'draft',
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

  await queryInterface.addIndex('PoliticalParties', ['status'], {
    name: 'political_parties_status_idx',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('PoliticalParties');
}
