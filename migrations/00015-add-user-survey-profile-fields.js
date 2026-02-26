import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('Users', 'dateOfBirth', {
    type: Sequelize.DataTypes.DATEONLY,
    allowNull: true
  });

  await queryInterface.addColumn('Users', 'genre', {
    type: Sequelize.DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('Users', 'documentNumber', {
    type: Sequelize.DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('Users', 'dateOfBirthLockedAt', {
    type: Sequelize.DataTypes.DATE,
    allowNull: true
  });

  await queryInterface.addColumn('Users', 'genreLockedAt', {
    type: Sequelize.DataTypes.DATE,
    allowNull: true
  });

  await queryInterface.addColumn('Users', 'documentNumberLockedAt', {
    type: Sequelize.DataTypes.DATE,
    allowNull: true
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeColumn('Users', 'documentNumberLockedAt');
  await queryInterface.removeColumn('Users', 'genreLockedAt');
  await queryInterface.removeColumn('Users', 'dateOfBirthLockedAt');
  await queryInterface.removeColumn('Users', 'documentNumber');
  await queryInterface.removeColumn('Users', 'genre');
  await queryInterface.removeColumn('Users', 'dateOfBirth');
}