const express = require('express')
const cors = require('cors');
const bodyParser = require("body-parser");
const connectToMongo = require('./db')
require("./models/Blog");
require("./models/Comment");

require('dotenv').config()

connectToMongo();
const app = express();
const port = process.env.PORT ;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public/images'));
app.use(cors());

app.use('/api/auth', require('./routes/auth'))
app.use('/api/blog', require('./routes/blog'))




app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})