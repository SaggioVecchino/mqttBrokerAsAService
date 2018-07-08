const mosca = require('mosca')

const settings = {
    port: 1883
    // On peut rajouter des param pour la persistance
}

const reqProtocol = 'http'
const reqURL = 'localhost'
const reqPort = 8000
const reqPathAuth = '/device/auth'

function reqPathAuthorizePub(project_id, group_name) {
    return `/projects/${project_id}/device_groups/${group_name}/topics/authPublish`
}

function reqPathAuthorizeSub(project_id, group_name, topic) {
    return `/projects/${project_id}/device_groups/${group_name}/topics/${topic}/authSubscribe`
}

function reqPathDisconnect(project_id, group_name, device_name) {
    // console.log(`/projects/${project_id}/device_groups/${group_name}/devices/${device_name}/disconnect`)
    return `/projects/${project_id}/device_groups/${group_name}/devices/${device_name}/disconnect`
}

const req = (reqProtocol, reqURL, reqPort, reqPath) => {
    return `${reqProtocol}://${reqURL}:${reqPort}${reqPath}`
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
    date: {type: Date, default: Date.now}
})

const publishedDataModel = db.model('publishedData', publishedDataSchema)

const subscribtionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String,
    topic: String, // On peut utiliser un tableau.. à discuter
    date: {type: Date, default: Date.now}
})

const subscribtionsModel = db.model('subscribtion', subscribtionsSchema)

const unsubscribtionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String,
    topic: String, // On peut utiliser un tableau.. à discuter
    date: {type: Date, default: Date.now}
})

const unsubscribtionsModel = db.model('unsubscribtion', unsubscribtionsSchema)

const connectionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String,
    date: {type: Date, default: Date.now}
})

const connectionsModel = db.model('connection', connectionsSchema)

const disconnectionsSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String, // Redondance pour des fins de performances
    date: {type: Date, default: Date.now}
})

const disconnectionsModel = db.model('disconnection', disconnectionsSchema)
const request = require('request');
// Accepts the connection if the username and password are valid

const authenticate = (client, username, password, callback) => {
    //console.log(`authenticate`)
    var deviceinfos = JSON.parse(username)
    var headers = {
        // we must add token here
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    // Configure the request
    var options = {
        url: req(reqProtocol, reqURL, reqPort, reqPathAuth),
        method: 'POST',
        headers: headers,
        form: deviceinfos //we must add token here
    }

    // Start the request
    request(options, (error, response, body) => {
        // console.log(`authenticate:`,error)

        if (!error && response.statusCode < 400) {
            // Print out the response body
            var authorized = JSON.parse(response.body)['flag'];
            //console.log(JSON.parse(response.body).flag)
            if (authorized) {
                client.user = JSON.parse(username)
                //client.user contains all the information we need about the device
            }
            callback(null, authorized)
        }
        else
            callback(null, false);
    })
}


const authorizePublish = (client, topic, payload, callback) => {
    // Utiliser sql pour vérifier que le client (on récupère le client.user)
    // a le droit de publier dans le topic 'topic'
    //we can do some check for the payload
    var headers = {
        // we must add token here
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    // Configure the request
    var options = {
        url: req(reqProtocol,
            reqURL,
            reqPort,
            reqPathAuthorizePub(client.user.project_id, client.user.group_name)),
        method: 'POST',
        headers: headers,
        form: {"topic": topic} //we must add token here
    }
    // Start the request
    request(options, (error, response, body) => {
        console.log(response.statusCode)
        if (!error && response.statusCode < 400) {
            //console.log('res.body::',response.body)
            var authorized = JSON.parse(response.body).flag;
            console.log(JSON.parse(response.body).message)
            callback(null, authorized)
        }
    })
}


var authorizeSubscribe = (client, topic, callback) => {

    var headers = {
        // we must add token here
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    // Configure the request
    var options = {
        url: req(reqProtocol,
            reqURL,
            reqPort,
            reqPathAuthorizeSub(client.user.project_id, client.user.group_name, topic)),
        method: 'POST',
        headers: headers,
        form: {} //we must add token here
    }

    console.log('subscribing')
    // Start the request
    request(options, (error, response, body) => {
        if (!error && response.statusCode < 400) {
            //console.log('res.body::',response.body)
            var authorized = JSON.parse(response.body).flag;
            callback(null, authorized)
        }
    })
}


const server = new mosca.Server(settings)

server.on('clientConnected', client => {

    console.log(`Device: ${client.user.device_name} connected`)
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

server.on('clientDisconnected', client => {

    // console.log(`Device: ${client.user.device_name} disconnected`)

    var instance = new disconnectionsModel({
        device_name: client.user.device_name,
        project_id: client.user.project_id,
        group_name: client.user.group_name
    })

    instance.save(err => {
        if (err) {
            throw err
        }
    })

    var request = require("request");

    var reqPathDisconnectStr = reqPathDisconnect(client.user.project_id, client.user.group_name,
        client.user.device_name)

    var options = {
        method: 'PATCH',
        url: req(reqProtocol, reqURL, reqPort, reqPathDisconnectStr),
        headers:
            {
                // we must add token here
                'Content-Type': 'application/x-www-form-urlencoded'
            },
        form: {}
    };

    request(options, function (error, response, body) {
        //console.log(error)
        if (error) throw new Error(error);
    });

})

server.on('published', (packet, client) => {
    if (!client)
        return;

    /*console.log(`
    ---------------------
    ${client.user.device_name}
    ---------------------`)*/

//  console.log(`data :: ${JSON.parse(packet.payload.toString()).data}`)


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
    // console.log('Published: packet::', packet)
    // console.log('Published: payload::', packet.payload.toString())
    // console.log('Published: payload::', packet.topic)
})

server.on('subscribed', (topic, client) => {
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

server.on('unsubscribed', (topic, client) => {
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
    server.authorizePublish = authorizePublish
    server.authorizeSubscribe = authorizeSubscribe
    console.log('Mosca server is up and running')
})