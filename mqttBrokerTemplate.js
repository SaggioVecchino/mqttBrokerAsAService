const mosca = require("mosca");
const mongooseModels = require("./mongooseModels");

const settings = {
  port: 1883
  // On peut rajouter des param pour la persistance
};

const reqProtocol = "http";
const reqURL = "iot2.brainiac.dz";
const reqPort = 8000;
const reqPathAuth = "/device/auth";
const reqPathDisconnectAllDevices = "/broker/disconnectalldevices";
function reqPathAuthorizePub(project_id, group_name) {
  return `/projects/${project_id}/device_groups/${group_name}/topics/authPublish`;
}

function reqPathAuthorizeSub(project_id, group_name) {
  return `/projects/${project_id}/device_groups/${group_name}/topics/authSubscribe`;
}

function reqPathDisconnect(project_id, group_name, device_name) {
  return `/projects/${project_id}/device_groups/${group_name}/devices/${device_name}/disconnect`;
}

const req = (reqProtocol, reqURL, reqPort, reqPath) => {
  return `${reqProtocol}://${reqURL}:${reqPort}${reqPath}`;
};

const request = require("request");
// Accepts the connection if the username and password are valid

const authenticate = (client, username, password, callback) => {
  // console.log(client);
  var deviceinfos = JSON.parse(username);
  var headers = {
    // we must add token here
    "Content-Type": "application/x-www-form-urlencoded"
  };
  // Configure the request
  var options = {
    url: req(reqProtocol, reqURL, reqPort, reqPathAuth),
    method: "POST",
    headers: headers,
    form: deviceinfos //we must add token here
  };

  // Start the request
  request(options, (error, response, body) => {
    if (!error && response.statusCode < 400) {
      //console.log(JSON.parse(response.body));
      var authorized = JSON.parse(response.body)["flag"];
      if (authorized) {
        client.user = JSON.parse(username);
        //client.user contains all the information we need about the device
      }
      callback(null, authorized);
    } else {
      callback(null, false);
    }
  });
};

const authorizePublish = (client, topic, payload, callback) => {
  // console.log(topic);
  // console.log(client.user.project_id);
  // console.log(client.user.group_name);
  //we can do some check for the payload
  var headers = {
    // we must add token here
    "Content-Type": "application/x-www-form-urlencoded"
    // Accept: "application/json"
  };
  // Configure the request
  var options = {
    url: req(
      reqProtocol,
      reqURL,
      reqPort,
      reqPathAuthorizePub(client.user.project_id, client.user.group_name)
    ),
    method: "POST",
    headers: headers,
    form: { topic: topic } //we must add token here
  };
  // console.log("here");
  // Start the request
  request(options, (error, response, body) => {
    //console.log(response.statusCode);
    if (!error && response.statusCode < 400) {
      var authorized = JSON.parse(response.body).flag;
      // console.log(authorized);
      callback(null, authorized);
    }
  });
};

var authorizeSubscribe = (client, topic, callback) => {
  var headers = {
    // we must add token here
    "Content-Type": "application/x-www-form-urlencoded"
  };
  var options = {
    url: req(
      reqProtocol,
      reqURL,
      reqPort,
      reqPathAuthorizeSub(client.user.project_id, client.user.group_name, topic)
    ),
    method: "POST",
    headers: headers,
    form: { topic: topic } //we must add token here
  };

  // console.log("subscribing");
  request(options, (error, response, body) => {
    if (!error && response.statusCode < 400) {
      var authorized = JSON.parse(response.body).flag;
      callback(null, authorized);
    }
  });
};

const server = new mosca.Server(settings);

server.on("clientConnected", client => {
  // console.log(`Device: ${client.user.device_name} connected`);
  var instance = new mongooseModels["connectionsModel"]({
    device_name: client.user.device_name,
    project_id: client.user.project_id,
    group_name: client.user.group_name
  });

  instance.save(err => {
    if (err) {
      throw err;
    }
  });
});

server.on("clientDisconnected", client => {
  // console.log(`Device: ${client.user.device_name} disconnected`)

  var instance = new mongooseModels["disconnectionsModel"]({
    device_name: client.user.device_name,
    project_id: client.user.project_id,
    group_name: client.user.group_name
  });

  instance.save(err => {
    if (err) {
      throw err;
    }
  });

  var request = require("request");

  var reqPathDisconnectStr = reqPathDisconnect(
    client.user.project_id,
    client.user.group_name,
    client.user.device_name
  );

  var options = {
    method: "PATCH",
    url: req(reqProtocol, reqURL, reqPort, reqPathDisconnectStr),
    headers: {
      // we must add token here
      "Content-Type": "application/x-www-form-urlencoded"
    },
    form: {}
  };

  request(options, function(error, response, body) {
    if (error) throw new Error(error);
  });
});

server.on("published", (packet, client) => {
  if (!client) return;

  /*console.log(`
    ---------------------
    ${client.user.device_name}
    ---------------------`)*/

  //  console.log(`data :: ${JSON.parse(packet.payload.toString()).data}`)

  var instance = new mongooseModels["publishedDataModel"]({
    device_name: client.user.device_name,
    project_id: client.user.project_id,
    group_name: client.user.group_name,
    data: JSON.parse(packet.payload.toString()).data, // à discuter avec l'équipe d'électronique
    topic: packet.topic
  });

  instance.save(err => {
    if (err) {
      throw err;
    }
  });
});

server.on("subscribed", (topic, client) => {
  var instance = new mongooseModels["subscribtionsModel"]({
    device_name: client.user.device_name,
    group_name: client.user.group_name,
    project_id: client.user.project_id,
    topic: topic
  });

  instance.save(err => {
    if (err) {
      throw err;
    }
  });
});

server.on("unsubscribed", (topic, client) => {
  var instance = new mongooseModels["unsubscribtionsModel"]({
    device_id: client.user.device_name,
    group_name: client.user.group_name,
    project_id: client.user.project_id,
    topic: topic
  });

  instance.save(err => {
    if (err) {
      throw err;
    }
  });
});

server.on("ready", () => {
  // console.log("onready");
  let headers = {
    "Content-Type": "application/x-www-form-urlencoded"
  };
  let options = {
    url: req(reqProtocol, reqURL, reqPort, reqPathDisconnectAllDevices),
    method: "PATCH",
    headers: headers
  };
  request(options, function(error, response, body) {
    if (!error && response.statusCode < 400) {
      server.authenticate = authenticate;
      server.authorizePublish = authorizePublish;
      server.authorizeSubscribe = authorizeSubscribe;
      console.log("Mosca server is up and running");
    }
  });
  //}
});

/*************************************************************************************/
const app = require("./nodeApiForLaravelSide");
const http = require("http");
const nodeApiPort = 1233;
const nodeApiServer = http.createServer(app).listen(nodeApiPort);
