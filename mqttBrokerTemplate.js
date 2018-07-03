const mosca = require('mosca')

const settings = {
    port: 1883
    // On peut rajouter des param pour la persistance
}

const mongoose = require('mongoose')
const databaseName = 'mqttdb'
const mongoDB = `mongodb://127.0.0.1:27017/${databaseName}`
mongoose.connect(mongoDB)
const db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'))

const publishedDataSchema = new mongoose.Schema({
    device_group: String,
    device_name: String,
    project_uuid: String, // Redondance pour des fins de performances
    data: Number, // On peut marquer le type comme dataTypeSchema.. à discuter
    topic: String, // On peut utiliser un tableau.. à discuter
    date: {type: Date, default: Date.now}
})

const publishedDataModel = db.model('publishedData', publishedDataSchema)

const subscribtionsSchema = new mongoose.Schema({
    device_id: String,
    project_id: String, // Redondance pour des fins de performances
    topic: String, // On peut utiliser un tableau.. à discuter
    date: {type: Date, default: Date.now}
})

const subscribtionsModel = db.model('subscribtion', subscribtionsSchema)

const unsubscribtionsSchema = new mongoose.Schema({
    device_id: String,
    project_id: String, // Redondance pour des fins de performances
    topic: String, // On peut utiliser un tableau.. à discuter
    date: {type: Date, default: Date.now}
})

const unsubscribtionsModel = db.model('unsubscribtion', unsubscribtionsSchema)

const connectionsSchema = new mongoose.Schema({
    device_name: String,
    device_group: String,
    project_id: String, // Redondance pour des fins de performances
    date: {type: Date, default: Date.now}
})

const connectionsModel = db.model('connection', connectionsSchema)

const disconnectionsSchema = new mongoose.Schema({
    device_name: String,
    device_group: String,
    project_id: String, // Redondance pour des fins de performances
    date: {type: Date, default: Date.now}
})

const disconnectionsModel = db.model('disconnection', disconnectionsSchema)
const request = require('request');
// Accepts the connection if the username and password are valid

const authenticate = function (client, username, password, callback) {

    // Username c'est le device_id et le password c'est le mdp correspondant à ce projet
    // On doit récupérer le project_id correspondant au device_id pour faire la vérification
    // On fait ça à partir du sql

    var daviceinfos = JSON.parse(username);
    var headers = {
        'User-Agent': 'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
// Configure the request
    var options = {
        url: 'http://localhost/device/auth',
        method: 'POST',
        headers: headers,
        form: daviceinfos
    }
    // Start the request
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // Print out the response body
            var authorized = response.flag;
            if (authorized) {
                client.user = username
            }
            callback(null, authorized);
        }
    })
}


const authorizePublish = function (client, topic, payload, callback) {
    // Utiliser sql pour vérifier que le client (on récupère le client.user)
    // a le droit de publier dans le topic 'topic'

    var authorized = (client.user == topic.split('/')[1])
    callback(null, authorized);
}


var authorizeSubscribe = function (client, topic, callback) {

    //
    //    
    var authorize = true // ici le traitement 
    //
    //

    callback(null, authorize);
}


const server = new mosca.Server(settings)

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

server.on('subscribed', function (topic, client) {
    var instance = new subscribtionsModel({
        device_id: client.user,
        projectId: project_id, // On doit l'obtenir à partir du sql
        topic: topic // à vérifier mais normalement c'est ça
    })

    instance.save(err => {
        if (err) {
            throw err
        }
    })
})

server.on('unsubscribed', function (topic, client) {
    var instance = new unsubscribtionsModel({
        device_id: client.user,
        projectId: project_id, // On doit l'obtenir à partir du sql
        topic: topic // à vérifier mais normalement c'est ça
    })

    instance.save(err => {
        if (err) {
            throw err
        }
    })
})

server.on('ready', () => {
    server.authenticate = authenticate
    console.log("server is ready !!");

    //server.authorizePublish = authorizePublish
    // server.authorizeSubscribe = authorizeSubscribe
    // console.log('Mosca server is up and running')
})
server.on('clientConnected', function(client) {
    console.log('client connected:::', client.user);
});

// fired when a message is received
server.on('published', function(packet, client) {
    console.log('Published', packet.payload);
});