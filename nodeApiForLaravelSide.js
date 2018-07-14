var express = require('express');
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const mongoose = require('mongoose')
const databaseName = 'mqttdb'
const mongoDB = `mongodb://127.0.0.1:27017/${databaseName}`
mongoose.connect(mongoDB)
const db = mongoose.connection
const publishedDataSchema = new mongoose.Schema({
    device_name: String,
    group_name: String,
    project_id: String,
    data: Number, // On peut marquer le type comme dataTypeSchema.. à discuter
    topic: String, // On peut utiliser un tableau.. à discuter
    date: {type: Date, default: Date.now}
})
var publishedDataModel = db.models['publishedData'] || db.model('publishedData', publishedDataSchema)

find1=function(that,query,callback){
    return that.find(query, callback);
}
publishedDataModel.findByQuery= function (query, callback) {
    // we will add the changes here
   // return this.find(query, callback);
    return find1(this,query, callback);
}


app.post('/data/:project_id', (req, res) => {
    // console.log("req.query", req.query);
    // console.log("req.body", req.body);
    // console.log("project_id", req.params.project_id);
    publishedDataModel.findByQuery(req.body,(err,result)=>{
        res.json(result);
    });
});


module.exports = app;