import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('ProjectMembers', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.DataTypes.INTEGER,
    },
    projectId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Projects',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    userId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    projectRole: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: 'supporter',
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

  await queryInterface.addConstraint('ProjectMembers', {
    fields: ['projectId', 'userId'],
    type: 'unique',
    name: 'project_members_project_id_user_id_unique',
  });

}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('ProjectMembers');
}
