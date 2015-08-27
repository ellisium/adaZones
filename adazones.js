var serialPort = require("serialport"),
SerialPort = serialPort.SerialPort,
exec = require('child_process').exec,
fs = require('fs'),
async=require('async'),
color=require('color');
module.exports={
	settingsBytes:function(){
		var self=this;
		var total=0; 
		var totalLeds=0;
		for(var i=0; i<self.zones.length; i++){
			var index=self.zones[i].index,
			leds=self.zones[i].leds,
			bytes=0;
			if(typeof index === 'number'){
				total+=3;
				bytes=3;
				var start=((index*3)+6);
				self.zones[i].bytesRange=[start, start+(bytes)-1];
			}else{
				bytes=leds*3;
				var start=((index[0]*3)+6);
				self.zones[i].bytesRange=[start, start+bytes-1];
				total+=leds*3;
			}
			self.zones[i].zoneBytes=bytes;
			self.zones[i].dataSend=0;
			if(!self.zones[i].hasOwnProperty('mode')){
				self.zones[i].mode=true;
			}
			self.zones[i].tmp=[];
		}
		self.settings.bytesTotal=total+6;
	},
	init:function(zone){
		var self= this;
		var zones=require(__dirname+'\\zones\\'+zone+'.json'),
		settings=require(__dirname+'\\settings.json');
		self.zones=zones;
		self.settings=settings;
		self.settingsBytes.call(self);
		console.log('init')
		self.stream.init.call(self,self.settings.stdin);
		self.connections.init.call(self);	
	},
	bytes:{
		headerData:[],
		tmp:[],
		count:0,
		header:false,
		record:false,
		setHeader:function(){
			var self=this; 
			for(var i=0; i<self.zones.length; i++){
				var zone=self.zones[i];
				//Select connection
				if(zone.hasOwnProperty('name')){
					var connectionName= zone.name;
				}else{
					var connectionName= self.settings.name;
				}
				//Manage header case for multuple boards
				if(zone.hasOwnProperty('header')){
					zone.tmp.push(self.bytes.header); 
				}
			}
		},
		splitData:function(data){
			var self=this;
			if(!self.bytes.record){
				for(var i=0; i<data.length; i++){
					if(data[i]==65){
						self.bytes.record=true;
						self.bytes.count+=data.length-i;
						self.bytes.headerData.push(data);
						if(!self.bytes.header){
							var arr=Buffer.concat(self.bytes.headerData);
							if(arr.length >= 6) self.bytes.header=arr.slice(0,6);
						}
					}
				}
				return;
			} 
				if(!self.bytes.header){
					self.bytes.headerData.push(data); 
					var arr=Buffer.concat(self.bytes.headerData);
					if(arr.length>=6){
						self.bytes.header=arr.slice(0,6);
					}else{
						return;
					}
				}
				var startBytes=self.bytes.count,
				total=self.bytes.count+data.length,
				indexZones=0;
				for(var i=0; i<self.zones.length; i++){ 
						var zone=self.zones[i];
						if(total>=zone.bytesRange[0])indexZones=i;
				}
				for(var ii=0; ii<data.length;ii++){
					if(self.bytes.count==self.settings.bytesTotal && (data[ii]==65)){
						self.bytes.count=1;
						self.bytes.setHeader.call(self);
						var buf=data.slice(ii+1, data.length);
						if(buf.length>0){
							self.bytes.splitData.call(self,buf); 
						}
						return;
					}
					self.bytes.count+=1;
					for(var i=0; i<indexZones+1; i++){ 
						var zone=self.zones[i],
						lastZone=0;
						if(((startBytes+ii) >= zone.bytesRange[0]) && ((startBytes+ii)<=zone.bytesRange[1])){
							if(zone.header){
								lastZone=i;
								if(zone.mode){
									zone.tmp.push(data.slice(ii, ii+1));
								}else{
									switch(zone.mode == true){
										case 'off':self.zones[lastZone].tmp.push(new Buffer(['00']));
										break;
										case 'color':
											var x=(self.bytes.count-zone.bytesRange[0])-1;
											zone.tmp.push(new Buffer([zone.colorArr.slice(x, x+1)]));
										break;
									}
								}
							}else{
								if(zone.mode == true){
									self.zones[lastZone].tmp.push(data.slice(ii, ii+1));
								}else{
									switch(zone.mode){
										case 'off':self.zones[lastZone].tmp.push(new Buffer(['00']));
										break;
										case 'color':
											var x=(self.bytes.count-zone.bytesRange[0])-1;
											self.zones[lastZone].tmp.push(new Buffer([zone.colorArr.slice(x, x+1)]));
										break;
									}
								}
							}
						} 
					}
				}
			
		},
		sendData:function(callback){
			var self= this;
			async.each(self.zones,
				function(item, cb){
					var zone=item; 
					if(zone.hasOwnProperty('name')){
						var connectionName= zone.name;
					}else{
						var connectionName= self.settings.name;
					} 
					if(zone.tmp.length>0 && zone.hasOwnProperty('header')){
						var tmp=Buffer.concat(zone.tmp); 
						zone.tmp=[];
						if(zone.delay){
							setTimeout(function(){
								self.bytes.drain(self.connections[connectionName], tmp, function(){
									cb();
								});
							}, zone.delay);
						}else{
							self.bytes.drain(self.connections[connectionName], tmp, function(){
								cb();
							});
						}
					}else{
						cb();
					}
				},
				function(e){
					if(e)console.log(e)
					callback()
				});
		},
		drain:function (connection, data, callback){ 
			console.log(true);
			connection.write(data,function(){
				connection.drain(function(){
					callback();
				});
			});	
		}
	},
	stream:{
		stdin:undefined,
		count:0,
		data:[],
		init:function (file){
			var self= this; 
			self.stream.stdin = fs.createReadStream(file);
			self.stream.stdin.on('error', function (e) {
				self.stream.stdin.end();
				self.stream.stdin=undefined;
				console.log(e+'stdin error');
				try{
					for(var connection in self.connections){
						if(typeof self.connections[connection] !== 'function'){
							//close connection
							self.connections[connection].close();
						}
					}
				}catch(err){console.log(err)}
				process.exit();
			})
			.on('data',function(data){ 
				self.stream.data.push(data);			
				self.bytes.sendData.call(self, function(){
					var wrData=Buffer.concat(self.stream.data);
					self.stream.data=[];
					self.bytes.splitData.call(self,wrData);
				});
			})
			.on('end', function(){
				console.log('end of stream')
			});
		}
	},
	connections:{
		init:function () {
			var self=this;
			if(self.settings.type==='COM'){
				self.connections[self.settings.name] = new SerialPort(self.settings.port, {baudrate: self.settings.baudrate}, false);
				self.connections.openConnection(self.settings.name);
			}
			for(var i=0; i<self.zones.length; i++){
				if(self.zones[i].hasOwnProperty('type') && self.zones[i].type==='COM'){
					var item=self.zones[i]; 
					self.connections[item.name] = new SerialPort(item.port, {baudrate: (item.baudrate ? item.baudrate : self.settings.baudrate)}, false);
					self.connections.openConnection(item.name);
				}
			}
		},
		openConnection:function(connectionName){
			var self=this; 
			var connection=self[connectionName];
			connection.open(function(err) {
				if(err) {console.log(err)}
			});
			connection
			.on('data',function(data){
				if(data.toString('utf8').match('Ada')){
					this.isReady=true;
				}
				console.log(connectionName+'data connection : '+data)
			})
			.on('close', function(){
				console.log(connectionName+' close connection')
			})
			.on('error', function(error){
				console.log(connectionName+' error:' + error)
			});
		},
		closeConnection:function(connectionName){
			var self=this; 
			var connection=self[connectionName];
			console.log('close connection'+ connectionName)
			connection.close(function(err) {
				if(err) {console.log(err)}
			});
		}
	},
	setPassthru:function(index){
		var self=this;
		self.zones[index].mode=true;
	},
	turnLastState:undefined,
	turnOn:function(index){
		var self=this;
		self.zones[index].mode=self.turnLastState;
	},
	turnOff:function(index){
		var self=this;
		self.turnLastState=self.zones[index].mode;
		self.zones[index].mode='off';
	},
	setDelay:function(index, delay){
		var self=this;
		self.zones[index].delay=delay;
	},
	setColor:function(index, colors, lvl){
		var self=this;
		var zone=self.zones[index],
		c=0; 
		zone.color=color();
		if(typeof colors ==='string'){
			if(lvl){
				zone.colorValues=zone.color()[colors](lvl).values
			}else{
				zone.colorValues=zone.color()[colors](255).values;
			}
			colors=[zone.colorValues.rgb[1],zone.colorValues.rgb[0],zone.colorValues.rgb[2]];
		}else{
			zone.colorValues=zone.color.rgb(colors);
		}
		zone.colorArr=[];
		for(var i=0; i<zone.zoneBytes; i++){
			zone.colorArr.push(colors[c]);
			c++;
			if(c===3)c=0;
		}
		zone.mode='color';
		return zone.color;
	},
	clearColor:function(index){
		var self=this;
		if(self.zones[index].hasOwnProperty('color')){
			self.zones[index].colorArr=[];
			self.zones[index].color=undefined;
		}
		return self;
	},
	//SEE Color module 
	negateColor:function(index){
		var self=this;
		self.setColor(index, self.zones[index].color.rgb(self.zones[index].colorValues.rgb).negate().values.rgb);
		return self;
	},
	lightenColor:function(index, lvl){
		var self=this;
		self.setColor(index, self.zones[index].color.rgb(self.zones[index].colorValues.rgb).lighten(lvl).values.rgb);
		return self;
	},
	darkenColor:function(index, level){
		var self=this;
		self.setColor(index, self.zones[index].color.rgb(self.zones[index].colorValues.rgb).darken(lvl).values.rgb);
		return self;
	},
	saturateColor:function(index, lvl){
		var self=this;
		self.setColor(index, self.zones[index].color.rgb(self.zones[index].colorValues.rgb).saturate(lvl).values.rgb);
		return self;
	},
	desaturateColor:function(index, lvl){
		var self=this;
		self.setColor(index, self.zones[index].color.rgb(self.zones[index].colorValues.rgb).desaturate(lvl).values.rgb);
		return self;
	},
	rotateColor:function(index, lvl){
		var self=this;
		self.setColor(index, self.zones[index].color.rgb(self.zones[index].colorValues.rgb).rotate(lvl).values.rgb);
		return self;
	}
}
