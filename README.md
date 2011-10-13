## Node-session

Node-session is HTTP session library for Node.js. Currently only one storage engine is supported - memecached. You will need 
to download and install this repository [https://github.com/elbart/node-memcache](https://github.com/elbart/node-memcache).

## Installation

Download github repository and unzip into nodu_modules folder of your node.js installation. Rename the folder into session.

## Usage

Here is an incomplete example. Fill in ... yourself.

<code>
	var http 	 = require('http');
	var session  = require('session');

	var server  = http.createServer(function (req, res) {
		var tmp 	= req.url.split('?');
		var cmd    	= tmp[0];
		var params 	= tmp[1];
		
		session.init(req, res);
		
		switch (cmd) {
			case '/start':
				session.write({ param1: 'param1', param2: 'param2'});
				break;
				
			case '/check':
				session.read(function (ses_data) {
					if (ses_data == null) {
						// no session
					}
					console.log(ses_data);
				});
				break;
			
			case '/destroy':
				session.destroy(res);
				break;
	}
	server.listen(90, "127.0.0.1");
	console.log('Server: http://127.0.0.1:90/');
</code>