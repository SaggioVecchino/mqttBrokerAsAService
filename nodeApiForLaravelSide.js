var express = require("express");
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

var publishedDataModel = require("./mongooseModels")["publishedDataModel"];

function getInterval(interval, now) {
  let time = 0;
  let time_now = new Date(now);
  switch (interval) {
    case "TY":
      time = new Date(time_now.getFullYear(), 0, 1).getTime();
      break;
    case "TM":
      time = new Date(time_now.getFullYear(), time_now.getMonth(), 1).getTime();
      break;
    case "TW":
      var day = time_now.getDay();
      time = new Date().setDate(time_now.getDate() - day);
      break;
    case "TD":
      time = new Date().setDate(time_now.getDate());
      break;
    case "TH":
      time = new Date(
        time_now.getFullYear(),
        time_now.getMonth(),
        time_now.getDate(),
        time_now.getHours()
      ).getTime();
      break;
    case "TM":
      time = new Date(
        time_now.getFullYear(),
        time_now.getMonth(),
        time_now.getDate(),
        time_now.getHours(),
        time_now.getMinutes()
      ).getTime();
      break;
  }
  return time;
}

function getMonthName(monthNum) {
  months = [
    "January",
    "Fabruary",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  return months[monthNum - 1];
}

function getDayName(dayNum) {
  days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];
  return days[dayNum];
}

function groupBy(interval, freq) {
  hours = {
    hour: {
      $add: [{ $multiply: [24, { $dayOfYear: "$date" }] }, { $hour: "$date" }]
    }
  };
  minutes = {
    minute: {
      $add: [
        { $multiply: [60, 24, { $dayOfYear: "$date" }] },
        { $multiply: [60, { $hour: "$date" }] },
        { $minute: "$date" }
      ]
    }
  };
  switch (interval) {
    case "TY":
      switch (freq) {
        case "Y":
          return { year: { $year: "$date" } };
        case "M":
          return { month: { $month: "$date" } };
        case "W":
          return { week: { $week: "$date" } };
        case "D":
          return { day: { $dayOfYear: "$date" } };
        case "H":
          return hours;
        case "Mn":
          return minutes;
      }
    case "TM":
      switch (freq) {
        case "M":
          return { month: { $month: "$date" } };
        case "W":
          return { week: { $week: "$date" } };
        case "D":
          return { day: { $dayOfMonth: "$date" } };
        case "H":
          return hours;
        case "Mn":
          return minutes;
      }
    case "TW":
      switch (freq) {
        case "W":
          return { week: { $week: "$date" } };
        case "D":
          return { day: { $dayOfWeek: "$date" } };
        case "H":
          return hours;
        case "Mn":
          return minutes;
      }
    case "TD":
      switch (freq) {
        case "D":
          return { day: { $dayOfWeek: "$date" } };
        case "H":
          return { hour: { $hour: "$date" } };
        case "Mn":
          return minutes;
      }
    case "TH":
      switch (freq) {
        case "H":
          return { hour: { $hour: "$date" } };
        case "Mn":
          return minutes;
      }
    case "TMn":
      switch (freq) {
        case "Mn":
          return minutes;
      }
  }
}

function restrict(project_id, topics, interval, groups, devices) {
  var obj = {};
  obj["$and"] = [];
  obj["$and"].push({ project_id: project_id });
  obj["$and"].push({ topic: { $regex: topics.substr(1, topics.length - 2) } });
  obj["$and"].push({ date: { $gt: new Date(interval) } }); //we can omit this to pull all data...
  if (!groups && !devices) return obj;

  var or = {};
  or["$or"] = [];
  if (groups) {
    or["$or"].push({ group_name: { $in: groups } });
  }
  if (devices) {
    devices.forEach(e => {
      or["$or"].push({
        $and: [{ device_name: e.device_name }, { group_name: e.group_name }]
      });
    });
  }
  obj["$and"].push(or);
  return obj;
}

function groupData(groupBy, aggregate, aggregateColumn, resultColumn) {
  var obj = {};
  var agg = {};
  obj["_id"] = groupBy; // _id : { month: { $month: "$date" }, day: { $dayOfMonth: "$date" }, year: { $year: "$date" } },
  obj["time"] = { $first: "$date" };
  if (aggregate === "count") {
    aggregate = "sum";
    aggregateColumn = 1;
    aggregate = "$" + aggregate;
    agg[aggregate] = aggregateColumn;
    obj[resultColumn] = agg;
  } else {
    aggregate = "$" + aggregate;
    agg[aggregate] = "$" + aggregateColumn; //we can handle multiple column result
    obj[resultColumn] = agg;
  }
  return obj;
}

publishedDataModel.findByQuery = function(query, callback) {
  var match = restrict(
    query.project_id,
    query.topics,
    getInterval(query.interval, query.time),
    typeof query.groups === "undefined" ? null : query.groups,
    typeof query.devices === "undefined" ? null : query.devices
  );
  var group = groupData(
    groupBy(query.interval, query.freq),
    query.agg,
    "data",
    `${query.agg}`
  );

  return publishedDataModel.aggregate(
    [
      {
        $match: match
      },
      {
        $group: group
      }
    ],
    callback
  );
};

function dateToStr(date, interval, freq) {
  switch (interval) {
    case "TY":
      switch (freq) {
        case "M":
          return getMonthName(date.getMonth());
        case "W":
          return "".concat(date.getDate(), " ", getMonthName(date.getMonth()));
        case "D":
          return "".concat(
            getDayName(date.getDay()),
            " ",
            date.getDate(),
            " ",
            getMonthName(date.getMonth())
          );
        case "H":
          return "".concat(
            date.getDate(),
            "/",
            date.getMonth(),
            " ",
            date.getHours(),
            "h"
          );
        case "Mn":
          return "".concat(
            date.getDate(),
            "/",
            date.getMonth(),
            " ",
            date.getHours(),
            ":",
            date.getMinutes()
          );
      }
    case "TM":
      switch (freq) {
        case "W":
          return "".concat(date.getDate(), " ", getMonthName(date.getMonth()));
        case "D":
          return "".concat(getDayName(date.getDay()), " ", date.getDate());
        case "H":
          return "".concat(
            date.getDate(),
            "/",
            date.getMonth(),
            " ",
            date.getHours(),
            "h"
          );
        case "Mn":
          return "".concat(
            date.getDate(),
            "/",
            date.getMonth(),
            " ",
            date.getHours(),
            ":",
            date.getMinutes()
          );
      }
    case "TW":
      switch (freq) {
        case "D":
          return getDayName(date.getDay());
        case "H":
          return "".concat(getDayName(date.getDay()), " ", date.getHours());
        case "Mn":
          return "".concat(
            getDayName(date.getDay()),
            " ",
            date.getHours(),
            ":",
            date.getMinutes()
          );
      }
    case "TD":
      switch (freq) {
        case "H":
          return date.getHours();
        case "Mn":
          return "".concat(date.getHours(), ":", date.getMinutes());
      }
  }
}

function findingLoop(req) {
  var promises = [];
  req.body.requestSets.forEach(function(reqSet) {
    var oneReq = {
      project_id: req.body.project_id,
      topics: reqSet.topics,
      interval: req.body.interval,
      groups: typeof reqSet.groups === "undefined" ? null : reqSet.groups,
      devices: typeof reqSet.devices === "undefined" ? null : reqSet.devices,
      freq: req.body.freq,
      agg: req.body.agg,
      time: req.body.time
    };

    promises.push(
      new Promise(function(resolve, reject) {
        publishedDataModel.findByQuery(oneReq, function(err, result) {
          if (!err) {
            var newRes = result.map(el => {
              for (key in el["_id"]) {
                // console.log("el date:::", el.time.toString());
                if (el["_id"].hasOwnProperty(key)) {
                  return {
                    x: el.time,
                    // {
                    //         // val:el["_id"][key],
                    //         // string:dateToStr(el.time,oneReq.interval,oneReq.freq)
                    //     }
                    y: el[oneReq.agg]
                  };
                }
              }
            });
            resolve(newRes);
          } else {
            reject(err);
          }
        });
      })
    );
  });
  return promises;
}

app.post("/data/:project_id", (req, res) => {
  // console.log("req.body:::", req.body);
  Promise.all(findingLoop(req))
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      // console.log(error);
      res.json(error); //we must discuss
    });
});

module.exports = app;
