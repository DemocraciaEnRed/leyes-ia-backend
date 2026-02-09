import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('Projects', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER
    },
/*     userId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }, */
    code: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    status: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    filename: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    },
    authorFullname: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    },
    title: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    },
    category: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true
    },
    summary: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true
    },
    content: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true
    },
    proposed_questions:{
      type: Sequelize.DataTypes.JSON,
      allowNull: true
    },
    publishedAt: {
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
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('Projects');
}