import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class KnowledgeBase extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      KnowledgeBase.belongsTo(models.Project, {
        foreignKey: 'projectId',
        targetKey: 'id',
        as: 'project',
      });
    }
  }
  KnowledgeBase.init({
    uuid: {
      type: DataTypes.STRING,
      allowNull: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      // "INDEX_JOB_STATUS_UNKNOWN"
      // "INDEX_JOB_STATUS_PARTIAL"
      // "INDEX_JOB_STATUS_IN_PROGRESS"
      // "INDEX_JOB_STATUS_COMPLETED"
      // "INDEX_JOB_STATUS_FAILED"
      // "INDEX_JOB_STATUS_NO_CHANGES" equals "INDEX_JOB_STATUS_COMPLETED" with no changes detected
      // "INDEX_JOB_STATUS_PENDING"
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        if('INDEX_JOB_STATUS_NO_CHANGES' === this.getDataValue('status')) {
          return 'INDEX_JOB_STATUS_COMPLETED';
        }
        return this.getDataValue('status');
      }
    },
    lastAPIResponse: {
      type: DataTypes.JSON,
      allowNull: true
    },
    lastAPIResponseAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
  }, {
    sequelize,
    timestamps: true,
    modelName: 'KnowledgeBase',
    tableName: 'KnowledgeBases',
  });

  return KnowledgeBase;
};