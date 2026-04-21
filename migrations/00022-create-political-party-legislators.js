import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('PoliticalPartyLegislators', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER,
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
    fullName: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    },
    chamber: {
      type: Sequelize.DataTypes.ENUM('senators', 'deputies'),
      allowNull: true,
    },
    provinceId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Provinces',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    photoUrl: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active',
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
  await queryInterface.dropTable('PoliticalPartyLegislators');
}
