const Database = require('sqlite3').Database;
const db = new Database('./backend/travel_system.db');

db.all('SELECT COUNT(*) FROM scenic_areas', (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('景区数量:', rows[0]['COUNT(*)']);
  }
  db.close();
});