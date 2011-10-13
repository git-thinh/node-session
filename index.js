var memcache = require('memcache');
var crypto 	 = require('crypto');

module.exports = {
	memcache: null,
	sesid: null,
	last_error: null,
	last_key: null,
	last_data: null,
	expires: 20*60*1000, // session timeout 20 min
	
	init: function (req, res) {
		this.sesid = null;
		var dt	= new Date();
		// init storage engine
		if (!this.memcache) {
			this.memcache = new memcache.Client(11211, 'localhost');
			this.memcache.connect();
		}
		// get session cookie		
		var cookie = [];
		if (req.headers['cookie']) cookie = String(req.headers['cookie']).split(';');
		for (var key in cookie) {
			var t = cookie[key].split('=');
			if (t[0] == 'sesid') this.sesid = t[1];
		}
		if (this.sesid == null || this.sesid == '') {
			console.log('Session: New session IP: '+ res['connection']['remoteAddress'] + ' Expires: ' + Math.floor(this.expires/60/1000) + ' mins');
			this.sesid = crypto.createHash('md5').update( String(dt.getTime()) + String(Math.random()) ).digest('hex');
		}
		res.setHeader('Set-Cookie', ["sesid=" + this.sesid]);
	},

	read: function (callback) {
		var parent 	= this;
		var dt		= new Date();
		this.last_error	= null;
		this.last_key 	= this.sesid;
		this.last_data	= null;
		// read memcache
		this.memcache.get(this.sesid, 
			function (error, result) { 
				if (error || !result) { 
					parent.last_error = "no session";
					parent.last_data  = "";
				} else {
					parent.last_error = "";
					parent.last_data  = result;
				}
				var ses = parent.json_decode(result)
				// check if session expired
				if (ses && ses['ses_expires'] && parseInt(ses['ses_expires']) < parseInt(dt.getTime())) {
					ses = null;
					parent.destroy();
				}
				callback(ses);
			}
		);
	},
	
	write: function (data, callback) {
		var parent  = this;
		var dt		= new Date();
		if (data != null && typeof(data) == "object") {
			data['ses_id'] 		= this.sesid;
			data['ses_expires'] = parseInt(dt.getTime()) + parseInt(this.expires);
		}
		// read memcache
		this.memcache.set(this.sesid, this.json_encode(data), callback);
	},
	
	destroy: function(res, callback) {
		var parent = this;
		if (res) res.setHeader('Set-Cookie', ["sesid="]);
		// if key doesn't exist then memcache.delete fails
		this.memcache.get(this.sesid, function(error, result) {
			parent.memcache.delete(this.sesid, callback);
		});		
		return true;
	},
	
	json_encode: function (obj) {
		var parts = [];
		var is_list = (Object.prototype.toString.apply(obj) === '[object Array]');

		for (var key in obj) {
			var value = obj[key];
			if (typeof(value) == "object") { //Custom handling for arrays
				var tmp = this.json_encode(value);
				parts.push((is_list ? '' : key +':')+ tmp); /* :RECURSION: */
			} else {
				var str = "";
				if (!is_list) str = key + ':';

				//Custom handling for multiple data types
				if (typeof(value) == "number") str += value; //Numbers
				else if (value === false) str += 'false'; //The booleans
				else if (value === true) str += 'true';
				else str += '\'' + String(value).replace(/'/g, "\\'") + '\''; //All other things

				parts.push(str);
			}
		}
		var json = parts.join(",");
		
		if (is_list) return '[' + json + ']'; //Return numerical JSON
		return '{' + json + '}'; //Return associative JSON
	},
	
	json_decode: function (str) {
		var obj = eval('('+ str +')');
		return obj;
	}	
}