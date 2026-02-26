import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('SystemLogs', {
    id: {
      type: Sequelize.DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.DataTypes.UUIDV4,
    },
    performed_by: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    action: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    },
    metadata: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DataTypes.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false,
    },
  }, {
    timestamps: false,
  });

  await queryInterface.addIndex('SystemLogs', ['performed_by']);
  await queryInterface.addIndex('SystemLogs', ['action']);
  await queryInterface.addIndex('SystemLogs', ['created_at']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('SystemLogs');
}
