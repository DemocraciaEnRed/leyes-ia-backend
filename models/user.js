// 'use strict';
import { Model } from 'sequelize';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';

async function hashPassword(password) {
  // console.log(password)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword
}

export default (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.belongsToMany(models.Project, {
        through: models.ProjectMember,
        foreignKey: 'userId',
        otherKey: 'projectId',
        as: 'projects',
      });
      User.hasMany(models.ProjectMember, {
        foreignKey: 'userId',
        sourceKey: 'id',
        as: 'projectMemberships',
      });
      User.hasMany(models.SystemLog, {
        foreignKey: 'performedBy',
        sourceKey: 'id',
        as: 'systemLogs',
      });
      User.hasMany(models.ProjectAiUsageEvent, {
        foreignKey: 'userId',
        sourceKey: 'id',
        as: 'projectAiUsageEvents',
      });
      User.belongsTo(models.Province, {
        foreignKey: 'provinceId',
        targetKey: 'id',
        as: 'province',
      });
    }
    comparePassword(password) {
      return bcrypt.compareSync(password, this.password);
    }

    async generateVerificationToken() {
      let data = {
        userId: this.id,
        event: 'email-verification',
        token: crypto.randomBytes(20).toString('hex'),
        expiresAt: dayjs().add(1, 'day').toDate()
      }
      let userToken = await sequelize.models.UserToken.create(data);
      return userToken;
    }
    
    async generateResetToken() {
      let data = {
        userId: this.id,
        event: 'password-reset',
        token: crypto.randomBytes(20).toString('hex'),
        expiresAt: dayjs().add(1, 'hour').toDate()
      }
      let userToken = await sequelize.models.UserToken.create(data);
      return userToken;
    }

    async generateJWT() {
      const expiresIn = '2d';

      this.lastLogin = new Date();
      await this.save();

      let payload = {
        id: this.id,
        email: this.email,
        role: this.role,
      }
      return jwt.sign(payload, process.env.JWT_SECRET, { 
        expiresIn
      });
    }

    async generatePasswordResetToken() {
      let data = {
        userId: this.id,
        event: 'password-reset',
        token: crypto.randomBytes(20).toString('hex'),
        expiresAt: dayjs().add(1, 'hour').toDate()
      }
      let userToken = await sequelize.models.UserToken.create(data);
      return userToken;
    }

    getUserSessionInfo() {
      const hasSurveyProfile = Boolean(this.dateOfBirth && this.genre && this.provinceId);

      return {
        id: this.id,
        email: this.email,
        firstName: this.firstName,
        lastName: this.lastName,
        fullName: this.fullName,
        role: this.role,
        imageUrl: this.imageUrl || this.gravatarUrl,
        dateOfBirth: this.dateOfBirth,
        genre: this.genre,
        provinceId: this.provinceId,
        hasSurveyProfile,
        surveyProfileLocks: {
          dateOfBirthLockedAt: this.dateOfBirthLockedAt,
          genreLockedAt: this.genreLockedAt,
          provinceLockedAt: this.provinceLockedAt,
        },
      }
    }
  }

  User.init({
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
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'user',
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.STRING(510),
      validate: {
        isUrl: true
      },
      allowNull: true
    },
    gravatarUrl: {
      type: DataTypes.VIRTUAL,
      get() {
        const hash = crypto.createHash('md5').update(this.email).digest('hex');
        return `https://www.gravatar.com/avatar/${hash}`;
      },
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    disabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    genre: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    documentNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateOfBirthLockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    genreLockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    documentNumberLockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    provinceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    provinceLockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    timestamps: true,
    modelName: 'User',
    tableName: 'Users',
  });

  // User.beforeCreate(async (user, options) => {
  //   console.log('beforeCreate')
  //   console.log(user.password)
  //   const hashedPassword = await hashPassword(user.password);
  //   user.password = hashedPassword;
  // });

  User.beforeSave(async (user, options) => {
    if (user.changed('password')) {
      const hashedPassword = await hashPassword(user.password);
      user.password = hashedPassword;
    }
  });


  return User;
};