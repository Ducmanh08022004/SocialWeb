const { DataTypes, Model } = require('sequelize');

class Story extends Model {
  static initModel(sequelize) {
    Story.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      media_url: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      media_type: {
        type: DataTypes.ENUM('image', 'video'),
        defaultValue: 'image'
      },
      duration: {
        type: DataTypes.INTEGER,
        defaultValue: 5000 // Default duration in ms for images
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    }, {
      sequelize,
      modelName: 'Story',
      tableName: 'stories',
      timestamps: false,
      hooks: {
        beforeValidate: (story) => {
          if (!story.expires_at) {
            // Set expiration to 24 hours from now
            story.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
          }
        }
      }
    });
  }
}

module.exports = Story;
