const mongoose = require('mongoose')
const databaseName = 'mqttdb'
const mongoDB = `mongodb://127.0.0.1:27017/${databaseName}`
mongoose.connect(mongoDB)

module.exports= mongoose