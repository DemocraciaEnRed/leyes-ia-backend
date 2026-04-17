import { Sequelize } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('LegislatorQuoteSearches', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.DataTypes.UUID,
      defaultValue: Sequelize.DataTypes.UUIDV4,
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
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    legislatorId: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Legislators',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    dateRangeStart: {
      type: Sequelize.DataTypes.DATEONLY,
      allowNull: true,
    },
    dateRangeEnd: {
      type: Sequelize.DataTypes.DATEONLY,
      allowNull: true,
    },
    result: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    },
    stance: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    found: {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    model: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    inputTokens: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    outputTokens: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    totalTokens: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    latencyMs: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    },
    groundingSources: {
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

  // Composite index for cache lookups
  await queryInterface.addIndex('LegislatorQuoteSearches', ['projectId', 'legislatorId', 'dateRangeStart', 'dateRangeEnd'], {
    name: 'lqs_cache_lookup_idx',
  });

  await queryInterface.addIndex('LegislatorQuoteSearches', ['projectId'], {
    name: 'lqs_projectId_idx',
  });

  await queryInterface.addIndex('LegislatorQuoteSearches', ['legislatorId'], {
    name: 'lqs_legislatorId_idx',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('LegislatorQuoteSearches');
}
