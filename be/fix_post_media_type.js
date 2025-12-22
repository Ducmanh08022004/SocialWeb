/**
 * Fix PostMedia table - Update type ENUM to include model3d
 * Run this to update your post_media table
 */

require('dotenv').config();
const { sequelize } = require('./models');
const { DataTypes } = require('sequelize');

async function fixPostMediaTable() {
  try {
    console.log('\n🔧 === FIXING POST_MEDIA TABLE ===\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const QueryInterface = sequelize.getQueryInterface();
    
    // Check existing columns
    console.log('Checking existing columns in post_media table...');
    const table = await QueryInterface.describeTable('post_media');
    console.log('Current columns:', Object.keys(table).join(', '));
    console.log('');

    // Check type column
    if (table.type) {
      console.log('Checking type column ENUM values...');
      const typeInfo = table.type;
      console.log('Type info:', typeInfo);
      
      // Update type ENUM to include model3d
      console.log('\nUpdating type ENUM to include: image, video, model3d...');
      await QueryInterface.changeColumn('post_media', 'type', {
        type: DataTypes.ENUM('image', 'video', 'model3d'),
        allowNull: true
      });
      console.log('✅ Updated type ENUM\n');
    }

    console.log('✅ === POST_MEDIA TABLE FIXED ===\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.message.includes('1091')) {
      console.log('\n⚠️ Note: If you see "Cant DROP COLUMN", the column might already be correct');
    }
  } finally {
    await sequelize.close();
  }
}

fixPostMediaTable();
