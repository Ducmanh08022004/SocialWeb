module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('profiles', 'cover_position', {
        type: Sequelize.INTEGER,
        defaultValue: 0, // 0% from top
        allowNull: false
      });
      console.log('Added cover_position to profiles table');
    } catch (error) {
      console.log('Column cover_position might already exist or error:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('profiles', 'cover_position');
  }
};
