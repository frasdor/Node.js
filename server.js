const app = require('./app')
const connectDB = require('./db');
require('dotenv').config();

connectDB();

app.listen(3000, () => {
  console.log("Server running. Use our API on port: 3000")
});
