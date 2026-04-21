import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('PoliticalPartyFiles', {
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
    type: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
    },
    mimeType: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    },
    s3Bucket: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    },
    s3Key: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
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
  await queryInterface.dropTable('PoliticalPartyFiles');
}
