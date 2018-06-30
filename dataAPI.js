const request = require('request')

var options = {
    method: 'GET',
    url: 'http://linkhere'
}

request(options, function (error, response, body) {
    if (error) console.log('problem')
    else{console.log('done!')}
})