import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('ProjectFiles', {
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
    type: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false
    },
    mimeType: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    s3Bucket: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    s3Key: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    url: {
      type: Sequelize.DataTypes.STRING,
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
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('ProjectFiles');
}