import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('Users', 'provinceId', {
    type: Sequelize.DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Provinces',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  await queryInterface.addColumn('Users', 'provinceLockedAt', {
    type: Sequelize.DataTypes.DATE,
    allowNull: true,
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeColumn('Users', 'provinceLockedAt');
  await queryInterface.removeColumn('Users', 'provinceId');
}
