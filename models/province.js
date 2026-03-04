import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
	class Province extends Model {
		static associate(models) {
			Province.hasMany(models.User, {
				foreignKey: 'provinceId',
				sourceKey: 'id',
				as: 'users',
			});

			Province.hasMany(models.ProjectSurveyAnswer, {
				foreignKey: 'provinceId',
				sourceKey: 'id',
				as: 'projectSurveyAnswers',
			});
		}
	}

	Province.init({
		code: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		isActive: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
		},
		sortOrder: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
	}, {
		sequelize,
		timestamps: true,
		modelName: 'Province',
		tableName: 'Provinces',
	});

	return Province;
};
