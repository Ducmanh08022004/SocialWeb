const { DataTypes, Model } = require('sequelize');

class Profile extends Model {
  static initModel(sequelize) {
    Profile.init({
      user_id: { type: DataTypes.INTEGER, primaryKey: true },
      fullname: { type: DataTypes.STRING(100) },
      des: { type: DataTypes.TEXT },
      avatar_url: { type: DataTypes.STRING(255) },
      avatar_type: {
          type: DataTypes.ENUM('image','model3d'),
          defaultValue: 'image'
      },
      avatar_public_id: { type: DataTypes.STRING(255) },
      avatar_thumbnail_url: { type: DataTypes.STRING(255) },
      avatar_thumbnail_public_id: { type: DataTypes.STRING(255) },
      cover_url: { type: DataTypes.STRING(255) },
      cover_public_id: { type: DataTypes.STRING(255) },
      cover_position: { type: DataTypes.INTEGER, defaultValue: 0 },
      birthday: { type: DataTypes.DATEONLY },
      gender: { type: DataTypes.ENUM('male','female','other') },
      updated_at: { type: DataTypes.DATE }
    }, {
      sequelize,
      modelName: 'Profile',
      tableName: 'profiles',
      timestamps: false
    });
  }
}

module.exports = Profile;