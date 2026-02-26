import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  const columns = await queryInterface.describeTable('Projects');

  if (columns.projectOwnerId) {
    return;
  }

  if (columns.projectOwnedId) {
    await queryInterface.renameColumn('Projects', 'projectOwnedId', 'projectOwnerId');
    return;
  }

  await queryInterface.addColumn('Projects', 'projectOwnerId', {
    type: Sequelize.DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
}

export async function down() {
}
