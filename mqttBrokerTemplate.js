const mosca = require('mosca')

const settings = {
    port: 1883
    // On peut rajouter des param pour la persistance
}

const mongoose = require('mongoose')
const databaseName = 'mqttdb'
const mongoDB = `mongodb://127.0.0.1/${databaseName}`
mongoose.connect(mongoDB)
const db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'))

const publishedDataSchema = new db.Schema({
    device_id: String,
    project_id: String, // Redondance pour des fins de performances
    data: Number, // On peut marquer le type comme dataTypeSchema.. à discuter
    topic: String, // On peut utiliser un tableau.. à discuter
    date: { type: Date, default: Date.now }
})

const publishedDataModel = db.model('publishedData', publishedDataSchema)

const subscribtionsSchema = new db.Schema({
    device_id: String,
    project_id: String, // Redondance pour des fins de performances
    topic: String, // On peut utiliser un tableau.. à discuter
    date: { type: Date, default: Date.now }
})

const subscribtionsModel = db.model('subscribtion', subscribtionsSchema)

const unsubscribtionsSchema = new db.Schema({
    device_id: String,
    project_id: String, // Redondance pour des fins de performances
    topic: String, // On peut utiliser un tableau.. à discuter
    date: { type: Date, default: Date.now }
})

const unsubscribtionsModel = db.model('unsubscribtion', unsubscribtionsSchema)

const connectionsSchema = new db.Schema({
    device_id: String,
    project_id: String, // Redondance pour des fins de performances
    date: { type: Date, default: Date.now }
})

const connectionsModel = db.model('connection', connectionsSchema)

const disconnectionsSchema = new db.Schema({
    device_id: String,
    project_id: String, // Redondance pour des fins de performances
    date: { type: Date, default: Date.now }
})

const disconnectionsModel = db.model('disconnection', disconnectionsSchema)

// Accepts the connection if the username and password are valid
const authenticate = function (client, username, password, callback) {
    // Username c'est le device_id et le password c'est le mdp correspondant à ce projet
    // On doit récupérer le project_id correspondant au device_id pour faire la vérification
    // On fait ça à partir du sql

    var authorized = (username === 'Lahcen' && password.toString() === 'iot');// Utiliser sql
    if (authorized) {
        client.user = username
    }
    callback(null, authorized);
}

const authorizePublish = function (client, topic, payload, callback) {
    // Utiliser sql pour vérifier que le client (on récupère le client.user)
    // a le droit de publier dans le topic 'topic'

    var authorized = (client.user == topic.split('/')[1])
    callback(null, authorized);
}

// // In this case the client authorized as alice can subscribe to /users/alice taking
// // the username from the topic and verifing it is the same of the authorized user
// var authorizeSubscribe = function(client, topic, callback) {
//     callback(null, client.user == topic.split('/')[1]);
// }
// On n'a pas besoin de subscriptions

const server = new mosca.Server(settings);

server.on('clientConnected', function (client) {

    var instance = new connectionsModel({
        device_id: client.user,
        projectId: project_id, // On doit l'obtenir à partir du sql
    })

    instance.save(err => {
        if (err) {
            throw err
        }
    })

    // console.log('Client connected', client.user);
})

server.on('clientDisconnected', function (client) {

    var instance = new disconnectionsModel({
        device_id: client.user,
        projectId: project_id, // On doit l'obtenir à partir du sql
    })

    instance.save(err => {
        if (err) {
            throw err
        }
    })

    // console.log('Client disconnected:', client.id);
})

server.on('published', function (packet, client) {

    var instance = new publishedDataModel({
        device_id: client.user,
        projectId: project_id, // On doit l'obtenir à partir du sql
        data: packet.payload.toString, // à verifier mais normalement c'est ça
        topic: packet.topic // à vérifier mais normalement c'est ça
    })

    instance.save(err => {
        if (err) {
            throw err
        }
    })

    // Pour vérifier:
    // console.log('Published: packet::', packet);
    // console.log('Published: payload::', packet.payload.toString())
    // console.log('Published: payload::', packet.topic)
})

server.on('ready', () => {
    server.authenticate = authenticate;
    server.authorizePublish = authorizePublish;
    // server.authorizeSubscribe = authorizeSubscribe;
    // console.log('Mosca server is up and running');
})