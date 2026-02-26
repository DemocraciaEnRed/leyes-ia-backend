export async function up({ context: queryInterface }) {
  const columns = await queryInterface.describeTable('Projects');

  if (!columns.projectOwnerId) {
    return;
  }

  await queryInterface.sequelize.query(`
    UPDATE Projects p
    INNER JOIN (
      SELECT pm.projectId, MAX(pm.userId) AS ownerUserId
      FROM ProjectMembers pm
      WHERE pm.projectRole = 'owner'
      GROUP BY pm.projectId
    ) owners ON owners.projectId = p.id
    SET p.projectOwnerId = owners.ownerUserId
    WHERE p.projectOwnerId IS NULL
  `);

  await queryInterface.sequelize.query(`
    DELETE FROM ProjectMembers
    WHERE projectRole = 'owner'
  `);
}

export async function down({ context: queryInterface }) {
  const columns = await queryInterface.describeTable('Projects');

  if (!columns.projectOwnerId) {
    return;
  }

  await queryInterface.sequelize.query(`
    INSERT INTO ProjectMembers (projectId, userId, projectRole, createdAt, updatedAt)
    SELECT p.id, p.projectOwnerId, 'owner', NOW(), NOW()
    FROM Projects p
    LEFT JOIN ProjectMembers pm
      ON pm.projectId = p.id
      AND pm.userId = p.projectOwnerId
    WHERE p.projectOwnerId IS NOT NULL
      AND pm.id IS NULL
  `);
}
