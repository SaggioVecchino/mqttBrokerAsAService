const mosca = require('mosca');

const settings = {
    port: 1883
}

// Accepts the connection if the username and password are valid
const authenticate = function (client, username, password, callback) {
    var authorized = (username === 'Lahcen' && password.toString() === 'iot');//using sql
    if (authorized) client.user = username + "...";
    callback(JSON.stringify({ message: "lahcen err", name: "push" }), authorized);
}

// In this case the client authorized as alice can publish to /users/alice taking
// the username from the topic and verifing it is the same of the authorized user
const authorizePublish = function (client, topic, payload, callback) {
    callback(null, client.user == topic.split('/')[1]);
}

// // In this case the client authorized as alice can subscribe to /users/alice taking
// // the username from the topic and verifing it is the same of the authorized user
// var authorizeSubscribe = function(client, topic, callback) {
//     callback(null, client.user == topic.split('/')[1]);
// }

const server = new mosca.Server(settings);

server.on('clientConnected', function (client) {
    console.log('client connected', client.user);
});

// fired when a client disconnects
server.on('clientDisconnected', function (client) {
    console.log('Client Disconnected:', client.id);
});

// fired when a message is received
server.on('published', function (packet, client) {
    console.log('..........');
    console.log('Published: packet::', packet);
    console.log('Published: payload::', packet.payload.toString());
});

server.on('ready', () => {
    server.authenticate = authenticate;
    server.authorizePublish = authorizePublish;
    // server.authorizeSubscribe = authorizeSubscribe;
    console.log('Mosca server is up and running');

})