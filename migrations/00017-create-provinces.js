import { Sequelize } from 'sequelize'

const PROVINCES = [
  { code: 'AR-C', name: 'Ciudad Autónoma de Buenos Aires', sortOrder: 1 },
  { code: 'AR-B', name: 'Buenos Aires', sortOrder: 2 },
  { code: 'AR-K', name: 'Catamarca', sortOrder: 3 },
  { code: 'AR-H', name: 'Chaco', sortOrder: 4 },
  { code: 'AR-U', name: 'Chubut', sortOrder: 5 },
  { code: 'AR-X', name: 'Córdoba', sortOrder: 6 },
  { code: 'AR-W', name: 'Corrientes', sortOrder: 7 },
  { code: 'AR-E', name: 'Entre Ríos', sortOrder: 8 },
  { code: 'AR-P', name: 'Formosa', sortOrder: 9 },
  { code: 'AR-Y', name: 'Jujuy', sortOrder: 10 },
  { code: 'AR-L', name: 'La Pampa', sortOrder: 11 },
  { code: 'AR-F', name: 'La Rioja', sortOrder: 12 },
  { code: 'AR-M', name: 'Mendoza', sortOrder: 13 },
  { code: 'AR-N', name: 'Misiones', sortOrder: 14 },
  { code: 'AR-Q', name: 'Neuquén', sortOrder: 15 },
  { code: 'AR-R', name: 'Río Negro', sortOrder: 16 },
  { code: 'AR-A', name: 'Salta', sortOrder: 17 },
  { code: 'AR-J', name: 'San Juan', sortOrder: 18 },
  { code: 'AR-D', name: 'San Luis', sortOrder: 19 },
  { code: 'AR-Z', name: 'Santa Cruz', sortOrder: 20 },
  { code: 'AR-S', name: 'Santa Fe', sortOrder: 21 },
  { code: 'AR-G', name: 'Santiago del Estero', sortOrder: 22 },
  { code: 'AR-V', name: 'Tierra del Fuego', sortOrder: 23 },
  { code: 'AR-T', name: 'Tucumán', sortOrder: 24 },
  { code: 'EXT', name: 'Extranjero', sortOrder: 25 },
];

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('Provinces', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER,
    },
    code: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    isActive: {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sortOrder: {
      type: Sequelize.DataTypes.INTEGER,
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
    },
  }, {
    timestamps: true,
    updatedAt: true,
  });

  const now = new Date();
  await queryInterface.bulkInsert('Provinces', PROVINCES.map((province) => ({
    ...province,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })));

  await queryInterface.addConstraint('Users', {
    fields: ['provinceId'],
    type: 'foreign key',
    name: 'users_provinceId_fkey',
    references: {
      table: 'Provinces',
      field: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  await queryInterface.addConstraint('ProjectSurveyAnswers', {
    fields: ['provinceId'],
    type: 'foreign key',
    name: 'projectSurveyAnswers_provinceId_fkey',
    references: {
      table: 'Provinces',
      field: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeConstraint('ProjectSurveyAnswers', 'projectSurveyAnswers_provinceId_fkey');
  await queryInterface.removeConstraint('Users', 'users_provinceId_fkey');
  await queryInterface.dropTable('Provinces');
}
