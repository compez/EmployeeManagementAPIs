var express = require('express');
var app = express();
var router = require('./router');
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded ({
	extended: true
}));

app.use(bodyParser.json());
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	next();
});
app.use('/api', router);
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send('Something is wrong');
	next();
});
app.use(express.static('avatar_store'));
app.listen(8080);
console.log("Employment Management App Server is running on port 8080");