export async function up({ context: queryInterface }) {
  const now = new Date();
  await queryInterface.bulkInsert('Provinces', [{
    code: 'EXT',
    name: 'Extranjero',
    isActive: true,
    sortOrder: 25,
    createdAt: now,
    updatedAt: now,
  }], {
    ignoreDuplicates: true,
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.bulkDelete('Provinces', {
    code: 'EXT',
    name: 'Extranjero',
  });
}
