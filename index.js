var fs = require('fs');
var express = require('express');
var app = express();
var url = require('url');
var http = require("http");
var request = require('request');


var Slack = require('slack-node');
var CronJob = require('cron').CronJob;
//var slackJS hold all the questions and answers

//=============== the node setup ================

app.set('port', (process.env.PORT || 8080));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

//=============== the SQL setup ================

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : '<MY_HOST_HERE>',
  user     : '<MY_USERNAME_HERE>',
  password : '<MY_PASSWORD_HERE>',
  database : '<MY_DATABASE_HERE>'
});

connection.connect();

//=============== get the f'in url ================


//function to get temporary code
app.get('/', function(request, response) {
    //displays html
    response.render('pages/index');

    //the temporary code
    var tempCode = url.parse(request.url,true).query.code;
    if (tempCode !== undefined){
        callAPI(tempCode)
    }

}); //app.get



function callAPI(tempCode){

    //get the f'in url
    request({
        url: 'https://slack.com/api/oauth.access',
        qs: {
            client_id: "<CLIENT_ID_HERE",
            client_secret: "CLIENT_SECRET_HERE",
            code: tempCode
        }, //Query string data
        method: 'GET', //Specify the method

    }, function(error, response, body){
        if(error) {
            console.log(error);
        } else {
            var data = JSON.parse(body)
            console.log(JSON.stringify(data))
            var permURL = data.incoming_webhook.url;
            var teamID = data.team_id;

            console.log(teamID)
            addtoSQL(permURL, teamID)
        }
    });

}//callAPI


// ===== add to SQL =======



function addtoSQL(permURL, teamID){

    connection.query('SELECT teamID FROM slackjstable WHERE teamId=?',teamID, function(err, rows, fields) {
        if (rows.length === 0){
            connection.query('INSERT INTO slackjstable (teamID, teamURL) VALUES (?, ?)',[teamID,permURL])
        }
    });

}//addtoSQL






// ===== the brains =======


// at 9:08:07 AM, do this
new CronJob('03 03 03 * * *', function() {

    //API call to get a question from SlackJS-question
    request('https://leon-do.github.io/slackJS-questions/', function (error, response, body) {

        var questionArray = JSON.parse(body)


        //get a random question
        myIndex = Math.floor(Math.random()*questionArray.length);



        connection.query('SELECT teamURL FROM slackjstable',function(err, rows, fields) {

            for (var i = 0; i < rows.length; i++){


                slack = new Slack();
                slack.setWebhook(rows[i].teamURL);

                slack.webhook({
                  channel: "slack-js",
                  username: "slackJS",
                  text: "```" + questionArray[myIndex] + "``` ",
                }, function(err, response) {
                  console.log(response);
                });

            }//loop
        });//connection


    })//request

}, null, true, 'America/New_York'); //cronjob
