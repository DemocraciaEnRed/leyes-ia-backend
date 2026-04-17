import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
	class Legislator extends Model {
		static associate(models) {
			Legislator.belongsTo(models.Province, {
				foreignKey: 'provinceId',
				targetKey: 'id',
				as: 'province',
			});
		}
	}

	Legislator.init({
		externalId: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		externalSource: {
			type: DataTypes.ENUM('hcdn', 'senado', 'other'),
			allowNull: true,
		},
		firstName: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		lastName: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		fullName: {
			type: DataTypes.VIRTUAL,
			get() {
				return `${this.firstName} ${this.lastName}`;
			},
		},
		chamber: {
			type: DataTypes.ENUM('deputies', 'senators'),
			allowNull: false,
		},
		provinceId: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		politicalPartyId: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		blockName: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		termStart: {
			type: DataTypes.DATEONLY,
			allowNull: true,
		},
		termEnd: {
			type: DataTypes.DATEONLY,
			allowNull: true,
		},
		photoUrl: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		email: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		active: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
		},
		metadata: {
			type: DataTypes.JSON,
			allowNull: true,
		},
	}, {
		sequelize,
		timestamps: true,
		modelName: 'Legislator',
		tableName: 'Legislators',
	});

	return Legislator;
};
