var mqtt = require("mqtt");
var client = mqtt.connect('mqtt://iot2.brainiac.dz:1883',
    {
        username: JSON.stringify({
            "project_id": "5",
            "password": "123456",
            "group_name": "group1",
            "device_name":"device1g4p5" //can be changed
        }), password: ""
    });

// client.publish('switch/tmp',
//     JSON.stringify({
//     'data': '29',
//     }))
client.subscribe('abc/def/ghi/d/ed')
client.on('message',(message)=>{
    console.log(message)
})

client.on('message', function (topic, message) {
    // message is Buffer
    console.log("message:::",message.toString())
    client.end()
})

client.on('error',function (e) {
    console.log('error :::',e)

})