import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  // Add FK constraint on existing politicalPartyId column in Legislators
  await queryInterface.addConstraint('Legislators', {
    fields: ['politicalPartyId'],
    type: 'foreign key',
    name: 'legislators_politicalPartyId_fk',
    references: {
      table: 'PoliticalParties',
      field: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  await queryInterface.addIndex('Legislators', ['politicalPartyId'], {
    name: 'legislators_politicalPartyId_idx',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeConstraint('Legislators', 'legislators_politicalPartyId_fk');
  await queryInterface.removeIndex('Legislators', 'legislators_politicalPartyId_idx');
}
