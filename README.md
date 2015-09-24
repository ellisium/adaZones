AdaZones is multizones and or multicards gestion for Adalight protocol.

some examples with my config:

[![SW intro](http://i.ytimg.com/vi_webp/4r5LH0HgOiQ/mqdefault.webp)](https://youtu.be/4r5LH0HgOiQ)

[![Everything Is AWESOME](http://i.ytimg.com/vi_webp/VqgWH9E7EC0/mqdefault.webp)](https://youtu.be/VqgWH9E7EC0)

Install: npm install adazones
TODO: VM install instructions coming soon

Configure settings.json:


		"stdin":"\\\\.\\pipe\\hyperion",  -> adalight stream from hyperion (VM pipe or dev/ttyUSB ttyACM (see hyperion doc)
		"name":"ambilight",               -> filename for your zones led settings (folder zones)
		"type":"COM",
		"port":"COM5",                   -> default COM number
		"white":[255,255,255],           -> define your white value
		"baudrate":500000,               -> COM baudrate speed (this setting has to be same in hyperion json config and arduino
		"VM":"hyperion"                  -> VM machine name to launch
		
		

For windows:
Edit the batch file : pathfile / port number /zone name
Create a shortcut and place it in launcher windows folder

Mode module :

  var adazones = require("adazones");
  adazones.init( your zone filename);

Mode server :

  node pathfile/adazones.js port:XXXXX zone:XXX
