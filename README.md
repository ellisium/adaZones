AdaZones is multizones and or multicards gestion for Adalight protocol.

some examples with my config:

[![SW intro](http://i.ytimg.com/vi_webp/4r5LH0HgOiQ/mqdefault.webp)](https://youtu.be/4r5LH0HgOiQ)

[![Everything Is AWESOME](http://i.ytimg.com/vi_webp/VqgWH9E7EC0/mqdefault.webp)](https://youtu.be/VqgWH9E7EC0)

Install: npm install adazones

-In settings.json, set your adalight stream source.
- Edit the batch file : pathfile / port number /zone name

-usage:

Mode module :
  var adazones = require("adazones");
  adazones.init( your zone filename);

Mode server
node pathfile/adazones.js port:XXXXX zone:XXX
