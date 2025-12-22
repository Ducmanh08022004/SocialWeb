const { DataTypes, Model } = require('sequelize');

class PostMedia extends Model {
  static initModel(sequelize) {
    PostMedia.init({
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      post_id: { type: DataTypes.INTEGER, allowNull: false },
      media_url: { type: DataTypes.STRING(255) },
      type: { type: DataTypes.ENUM('image','video','model3d') },
      public_id: { type: DataTypes.STRING(255) }
    }, {
      sequelize,
      modelName: 'PostMedia',
      tableName: 'post_media',
      timestamps: false
    });
  }
}

module.exports = PostMedia;