import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  const columns = await queryInterface.describeTable('Projects');

  if (!columns.projectOwnerId) {
    return;
  }

  await queryInterface.sequelize.query(`
    UPDATE Projects p
    LEFT JOIN (
      SELECT
        pm.projectId,
        COALESCE(
          MAX(CASE WHEN pm.projectRole = 'owner' THEN pm.userId END),
          MIN(pm.userId)
        ) AS fallbackUserId
      FROM ProjectMembers pm
      GROUP BY pm.projectId
    ) members ON members.projectId = p.id
    SET p.projectOwnerId = members.fallbackUserId
    WHERE p.projectOwnerId IS NULL
  `);

  await queryInterface.changeColumn('Projects', 'projectOwnerId', {
    type: Sequelize.DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
}

export async function down({ context: queryInterface }) {
  const columns = await queryInterface.describeTable('Projects');

  if (!columns.projectOwnerId) {
    return;
  }

  await queryInterface.changeColumn('Projects', 'projectOwnerId', {
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
