var mqtt = require("mqtt");
var client = mqtt.connect('mqtt://localhost:1883',
    {
        username: JSON.stringify({
            "project_id": "2",
            "password": "passs",
            "group_name": "groupe10-taki..",
            "device_name":"CPU1"
        }), password: "shashhsa-52-bits"
    });

client.publish('presence', 'Hello mqtt')