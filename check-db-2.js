const Database = require('sqlite3').Database;
const db = new Database('./backend/travel_system.db');

db.all('SELECT * FROM scenic_areas LIMIT 10', (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('前10个景区:', rows);
  }
  db.close();
});