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
    device_name: String,
    group_name: String,
    project_id: String,
    data: Number, // On peut marquer le type comme dataTypeSchema.. à discuter
    topic: String, // On peut utiliser un tableau.. à discuter
    date: { type: Date, default: Date.now }
})

const publishedDataModel = db.model('publishedData', publishedDataSchema)

const subscribtionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String,
    topic: String, // On peut utiliser un tableau.. à discuter
    date: { type: Date, default: Date.now }
})

const subscribtionsModel = db.model('subscribtion', subscribtionsSchema)

const unsubscribtionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String,
    topic: String, // On peut utiliser un tableau.. à discuter
    date: { type: Date, default: Date.now }
})

const unsubscribtionsModel = db.model('unsubscribtion', unsubscribtionsSchema)

const connectionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String,
    date: { type: Date, default: Date.now }
})

const connectionsModel = db.model('connection', connectionsSchema)

const disconnectionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String, // Redondance pour des fins de performances
    date: { type: Date, default: Date.now }
})

const disconnectionsModel = db.model('disconnection', disconnectionsSchema)
const request = require('request');
// Accepts the connection if the username and password are valid

const authenticate = function (client, username, password, callback) {//##
    //console.log(`authenticate`)
    var daviceinfos = JSON.parse(username);
    client.connack = {returnCode: 1}
    var headers = {
        'User-Agent': 'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    // Configure the request
    var options = {
        url: 'http://localhost:8000/device/auth',
        method: 'POST',
        headers: headers,
        form: daviceinfos
    }
    // Start the request
    request(options, function (error, response, body) {
        //console.log(`${response.statusMessage}`)
        if (!error && response.statusCode < 400) {
            // Print out the response body

            var authorized = JSON.parse(response.body).flag;
            //console.log(JSON.parse(response.body).flag)
            if (authorized) {
                client.user = JSON.parse(username)
                //client.user contains all the information we need about the device
                //console.log(username)
            }
            //else  console.log(`FALSE: ${username}`)
            /*var error = new Error('Auth!!!!!!!!!!!!')
            error.returnCode = 1*/
            callback(null, authorized)
            //callback(3, authorized);
        }
        else
            callback(null, false);
        // console.log(`${response.statusCode}`)
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
        device_name: client.user.device_name,
        project_id: client.user.project_id,
        group_name: client.user.group_name
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
        device_name: client.user.device_name,
        project_id: client.user.project_id,
        group_name: client.user.group_name
    })
    console.log(client.user.group_name)

    instance.save(err => {
        if (err) {
            throw err
        }
    })

    // console.log('Client disconnected:', client.id);
})

server.on('published', function (packet, client) {
    if (!client)
        return;

    console.log(`
    ---------------------
    ${client.user.device_name}
    ---------------------`)

    console.log(`${JSON.parse(packet.payload.toString()).data}`)

    var instance = new publishedDataModel({
        device_name: client.user.device_name,
        project_id: client.user.project_id,
        group_name: client.user.group_name,
        data: JSON.parse(packet.payload.toString()).data, // à discuter avec l'équipe d'électronique
        topic: packet.topic
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
        device_name: client.user.device_name,
        group_name: client.user.group_name,
        project_id: client.user.project_id,
        topic: topic
    })

    instance.save(err => {
        if (err) {
            throw err
        }
    })
})

server.on('unsubscribed', function (topic, client) {
    var instance = new unsubscribtionsModel({
        device_id: client.user.device_name,
        group_name: client.user.group_name,
        project_id: client.user.project_id,
        topic: topic
    })

    instance.save(err => {
        if (err) {
            throw err
        }
    })
})

server.on('ready', () => {
    server.authenticate = authenticate
    //server.authorizePublish = authorizePublish
    // server.authorizeSubscribe = authorizeSubscribe
    console.log('Mosca server is up and running')
})

server.on('clientConnected', function (client) {
    if (!client)
        return;
    console.log('!::client connected::!');
});