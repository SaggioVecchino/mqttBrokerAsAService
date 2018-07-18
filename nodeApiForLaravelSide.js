var express = require('express');
var app = express();
app.use(express.json());
app.use(express.urlencoded({extended: false}));

var publishedDataModel = require('./mongooseModels')['publishedDataModel']

function getInterval(interval) {
    let time = 0
    let now = new Date()
    switch (interval) {
        case "TY":
            time = new Date(now.getFullYear(), 0, 1).getTime();
            break;
        case "TM":
            time = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            break;
        case "TW":
            var day = now.getDay();
            time = new Date().setDate(now.getDate() - day);
            break;
        case "TD":
            time = new Date().setDate(now.getDate())
            break;
        case "TH":
            time = new Date(now.getFullYear(),
                now.getMonth(), now.getDate(),
                now.getHours()).getTime();
            break;
    }
    return time
}

function getMonth(monthNum) {
    months = [
        "January", "Fabruary", "March",
        "April", "May", "December", "June",
        "July", "August", "September",
        "October", "Novembe", "December"
    ]
    return months[monthNum]
}

function getDay(dayNum) {
    days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayNum]
}

function groupBy(interval, freq) {
    switch (freq) {
        case 'M':
            return {month: {$month: "$date"}}
        case 'W':
            return {week: {$week: "$date"}}
        case 'D':
            return {day: {$dayOfYear: "$date"}}
        case 'H':
            return {
                hour: {
                    $add: [
                        {$multiply: [24, {$dayOfYear: "$date"}]},
                        {$hour: "$date"}
                    ]
                }
            }
        case 'Mn':
            return {
                minute:
                    {
                        $add: [
                            {$multiply: [60, 24, {$dayOfYear: "$date"}]},
                            {$multiply: [60, {$hour: "$date"}]},
                            {$minute: "$date"}
                        ]
                    }

            }
    }
}

function restrict(project_id, topics, interval, groups, devices) {

    var obj = {}
    obj["$and"] = []
    obj["$and"].push({project_id: project_id})
    obj["$and"].push({topic: {$regex: topics.substr(1, topics.length - 2)}})
    obj["$and"].push({date: {$gt: new Date(interval)}}) //we can omit this to pull all data...

    if (groups) {
        var or = {}
        or["$or"] = []
        or["$or"].push({group_name: {$in: groups}})
    }

    if (devices) {
        devices.forEach((e) => {
            or["$or"].push(
                {
                    $and: [
                        {"device_name": e.device_name},
                        {"group_name": e.group_name}
                    ]
                })
        })
        obj["$and"].push(or)
    }
    return obj
}

function groupData(groupBy, aggregate, aggregateColumn, resultColumn) {
    var obj = {}
    var agg = {}
    obj["_id"] = groupBy // _id : { month: { $month: "$date" }, day: { $dayOfMonth: "$date" }, year: { $year: "$date" } },
    if (aggregate === 'count') {
        aggregate = 'sum'
        aggregateColumn = 1
        aggregate = "$" + aggregate
        agg[aggregate] = aggregateColumn
        obj[resultColumn] = agg
    }
    else {
        aggregate = "$" + aggregate
        agg[aggregate] = "$" + aggregateColumn //we can handle multiple column result
        obj[resultColumn] = agg
    }
    return obj
}

publishedDataModel.findByQuery = function (query, callback) {

    var match = restrict(query.project_id, query.topics, getInterval(query.interval),
        typeof query.groups === "undefined" ? null : query.groups,
        typeof query.devices === "undefined" ? null : query.devices)

    var group = groupData(groupBy(query.interval, query.freq), query.agg, 'data', `${query.agg}`)

    return publishedDataModel.aggregate(
        [
            {
                $match: match
            },
            {
                $group: group
            }
        ], callback)
}

function findingLoop(req) {
    var promises = []
    req.body.requestSets.forEach(function (reqSet) {
        var oneReq = {
            project_id: req.body.project_id,
            topics: reqSet.topic,
            interval: req.body.interval,
            groups: typeof reqSet.groups === "undefined" ?
                null : reqSet.groups,
            devices: typeof reqSet.devices === "undefined" ?
                null : reqSet.devices,
            freq: req.body.freq,
            agg: req.body.agg
        }
        promises.push(
            new Promise(
                function (resolve, reject) {
                    publishedDataModel.findByQuery(oneReq, function (err, result) {
                        if (!err) {
                            var newRes = result.map((el) => {
                                for (key in el["_id"]) {
                                    if (el["_id"].hasOwnProperty(key)) {
                                        return {
                                            x: el["_id"][key],
                                            y: el[req.body.agg]
                                        };
                                    }
                                }
                            })
                            resolve(newRes);
                        }
                        else {
                            reject(err)
                        }
                    })
                }
            )
        )
    })
    return promises
}

app.post('/data/:project_id', (req, res) => {
    Promise.all(findingLoop(req)).then(result => {
        res.json(result)
    }).catch(error => {
        res.json(error) //we must discuss
    })
});

module.exports = app;