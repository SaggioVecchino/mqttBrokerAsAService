const mongoose = require('./mongooseConnexion')
const db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'))
var mongooseModels={}

const publishedDataSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String,
    data: Number, // On peut marquer le type comme dataTypeSchema.. à discuter
    topic: String, // On peut utiliser un tableau.. à discuter
    date: {type: Date, default: Date.now}
})

mongooseModels["publishedDataModel"] = db.model('publishedData', publishedDataSchema)

const subscribtionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String,
    topic: String, // On peut utiliser un tableau.. à discuter
    date: {type: Date, default: Date.now}
})

mongooseModels["subscribtionsModel"]  = db.model('subscribtion', subscribtionsSchema)

const unsubscribtionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String,
    topic: String, // On peut utiliser un tableau.. à discuter
    date: {type: Date, default: Date.now}
})

mongooseModels["unsubscribtionsModel"]   = db.model('unsubscribtion', unsubscribtionsSchema)

const connectionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String,
    date: {type: Date, default: Date.now}
})

mongooseModels["connectionsModel"]  = db.model('connection', connectionsSchema)

const disconnectionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String, // Redondance pour des fins de performances
    date: {type: Date, default: Date.now}
})

mongooseModels["disconnectionsModel"]   = db.model('disconnection', disconnectionsSchema)




module.exports= mongooseModels