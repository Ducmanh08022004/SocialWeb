require('dotenv').config();
const { sequelize } = require('./models');

async function runMigration() {
  try {
    console.log('Starting migration...');
    const migration = require('./migrations/add_cover_position_to_profiles');
    const QueryInterface = sequelize.getQueryInterface();
    
    await migration.up(QueryInterface, require('sequelize').DataTypes);
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
