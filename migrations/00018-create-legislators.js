import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('Legislators', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER,
    },
    externalId: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    externalSource: {
      type: Sequelize.DataTypes.ENUM('hcdn', 'senado', 'other'),
      allowNull: true,
    },
    firstName: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    },
    chamber: {
      type: Sequelize.DataTypes.ENUM('deputies', 'senators'),
      allowNull: false,
    },
    provinceId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Provinces',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    politicalPartyId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    blockName: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    termStart: {
      type: Sequelize.DataTypes.DATEONLY,
      allowNull: true,
    },
    termEnd: {
      type: Sequelize.DataTypes.DATEONLY,
      allowNull: true,
    },
    photoUrl: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    active: {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    metadata: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
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
  });

  // Composite unique index on externalId + externalSource
  await queryInterface.addIndex('Legislators', ['externalId', 'externalSource'], {
    unique: true,
    name: 'legislators_externalId_externalSource_unique',
    where: {
      externalId: { [Sequelize.Op.ne]: null },
      externalSource: { [Sequelize.Op.ne]: null },
    },
  });

  // Individual indexes for frequent filters/sorts
  await queryInterface.addIndex('Legislators', ['chamber'], {
    name: 'legislators_chamber_idx',
  });

  await queryInterface.addIndex('Legislators', ['provinceId'], {
    name: 'legislators_provinceId_idx',
  });

  await queryInterface.addIndex('Legislators', ['active'], {
    name: 'legislators_active_idx',
  });

  await queryInterface.addIndex('Legislators', ['lastName'], {
    name: 'legislators_lastName_idx',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('Legislators');
}
