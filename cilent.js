var mqtt = require("mqtt");
var client = mqtt.connect('mqtt://localhost:1883',
    {
        username: JSON.stringify({
            "project_id": "3",
            "password": "aaabbb",
            "group_name": "aaabbb",
            "device_name":"hhsfdsfdsxkkhh"
        }), password: "shashhsa-52-bits"
    });

client.publish('presence',
    JSON.stringify({
    "data": "84564",
    }))