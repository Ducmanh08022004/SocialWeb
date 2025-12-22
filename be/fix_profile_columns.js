/**
 * Fix Profile table - Add missing columns
 * Run this to update your profiles table
 */

require('dotenv').config();
const { sequelize } = require('./models');
const { DataTypes } = require('sequelize');

async function fixProfileTable() {
  try {
    console.log('\n🔧 === FIXING PROFILE TABLE ===\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const QueryInterface = sequelize.getQueryInterface();
    
    // Check existing columns
    console.log('Checking existing columns in profiles table...');
    const table = await QueryInterface.describeTable('profiles');
    console.log('Current columns:', Object.keys(table).join(', '));
    console.log('');

    // Add missing columns if they don't exist
    const missingColumns = [];

    if (!table.avatar_type) {
      console.log('Adding avatar_type column...');
      await QueryInterface.addColumn('profiles', 'avatar_type', {
        type: DataTypes.ENUM('image', 'model3d'),
        defaultValue: 'image',
        allowNull: true
      });
      missingColumns.push('avatar_type');
      console.log('✅ Added avatar_type\n');
    }

    if (!table.avatar_public_id) {
      console.log('Adding avatar_public_id column...');
      await QueryInterface.addColumn('profiles', 'avatar_public_id', {
        type: DataTypes.STRING(255),
        allowNull: true
      });
      missingColumns.push('avatar_public_id');
      console.log('✅ Added avatar_public_id\n');
    }

    if (!table.cover_url) {
      console.log('Adding cover_url column...');
      await QueryInterface.addColumn('profiles', 'cover_url', {
        type: DataTypes.STRING(255),
        allowNull: true
      });
      missingColumns.push('cover_url');
      console.log('✅ Added cover_url\n');
    }

    if (!table.cover_public_id) {
      console.log('Adding cover_public_id column...');
      await QueryInterface.addColumn('profiles', 'cover_public_id', {
        type: DataTypes.STRING(255),
        allowNull: true
      });
      missingColumns.push('cover_public_id');
      console.log('✅ Added cover_public_id\n');
    }

    if (!table.birthday) {
      console.log('Adding birthday column...');
      await QueryInterface.addColumn('profiles', 'birthday', {
        type: DataTypes.DATEONLY,
        allowNull: true
      });
      missingColumns.push('birthday');
      console.log('✅ Added birthday\n');
    }

    if (!table.gender) {
      console.log('Adding gender column...');
      await QueryInterface.addColumn('profiles', 'gender', {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: true
      });
      missingColumns.push('gender');
      console.log('✅ Added gender\n');
    }

    if (!table.updated_at) {
      console.log('Adding updated_at column...');
      await QueryInterface.addColumn('profiles', 'updated_at', {
        type: DataTypes.DATE,
        allowNull: true
      });
      missingColumns.push('updated_at');
      console.log('✅ Added updated_at\n');
    }

    if (missingColumns.length === 0) {
      console.log('✅ All columns already exist\n');
    } else {
      console.log(`✅ Added ${missingColumns.length} missing columns\n`);
    }

    // Verify all columns now exist
    const updatedTable = await QueryInterface.describeTable('profiles');
    console.log('Final columns:', Object.keys(updatedTable).join(', '));
    console.log('\n✅ === PROFILE TABLE FIXED ===\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\nStack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

fixProfileTable();
