const { seedDashboardData } = require('../lib/seed-dashboard');

seedDashboardData()
  .then((result) => {
    console.log('Dashboard seeding completed:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Dashboard seeding failed:', error);
    process.exit(1);
  });
