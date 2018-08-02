var mqtt = require("mqtt");
var client = mqtt.connect('mqtt://127.0.0.1:1883',
    {
        username: JSON.stringify({
            "project_id": "1",
            "password": "123456",
            "group_name": "group1",
            "device_name":"device3g1p1" //can be changed
        }), password: ""
    });

// client.publish('switch/tmp',
//     JSON.stringify({
//     'data': '29',
//     }))
var i=10
var j=1
setInterval(()=>{
    client.publish('switch/test2',
        JSON.stringify({
            'data':i ,
        })
    )
    i=i+j;
    if (i==90000) j=-1
    if (i==50) j=1
    console.log('sending data')
},20);



//
// client.subscribe('abc/def/ghi/d/ed')
// client.on('message',(message)=>{
//     console.log(message)
// })
//
// client.on('message', function (topic, message) {
//     // message is Buffer
//     console.log("message:::",message.toString())
//     client.end()
// })
//
// client.on('error',function (e) {
//     console.log('error :::',e)
//
// })