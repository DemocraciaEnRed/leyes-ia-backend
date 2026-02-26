import { Model } from 'sequelize';

const PROJECT_MEMBER_ROLES = ['manager', 'supporter'];

export { PROJECT_MEMBER_ROLES };

export default (sequelize, DataTypes) => {
  class ProjectMember extends Model {
    static associate(models) {
      ProjectMember.belongsTo(models.Project, {
        foreignKey: 'projectId',
        targetKey: 'id',
        as: 'project',
      });

      ProjectMember.belongsTo(models.User, {
        foreignKey: 'userId',
        targetKey: 'id',
        as: 'user',
      });
    }
  }

  ProjectMember.init(
    {
      projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      projectRole: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'supporter',
        validate: {
          isIn: [PROJECT_MEMBER_ROLES],
        },
      },
    },
    {
      sequelize,
      timestamps: true,
      modelName: 'ProjectMember',
      tableName: 'ProjectMembers',
      indexes: [
        {
          unique: true,
          fields: ['projectId', 'userId'],
        },
      ],
    },
  );

  return ProjectMember;
};
