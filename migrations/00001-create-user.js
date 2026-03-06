import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('Users', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER
    },
      firstName: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      password: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'user',
        allowNull: false,
      },
      imageUrl: {
        type: Sequelize.DataTypes.STRING(510),
        allowNull: true
      },
      emailVerified: {
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      verifiedAt: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      lastLogin: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      dateOfBirth: {
        type: Sequelize.DataTypes.DATEONLY,
        allowNull: true,
      },
      genre: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      documentNumber: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      dateOfBirthLockedAt: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      genreLockedAt: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      documentNumberLockedAt: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      provinceId: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
      },
      provinceLockedAt: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      disabled: {
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
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
      }
    });
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('Users');
}