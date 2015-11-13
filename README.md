This is the npm library for City Hall Enterprise Settings Server

# ABOUT

 This project can be installed using:

```
npm install cityhall
````

# USAGE

 The intention is to use the built-in City Hall web site for actual
 settings management, and then use this library for consuming those
 settings, in an application.  As such, there is really only command 
 to be familiar with:

 ```javascript
 // synchronous, blocking calling
 var settings = require('cityhall')('http://path.to.server/api');
 var value = settings.getValSync('/test/val1');
 console.log(value);
 ```

 Or:

 ```javascript
 // asynchronous operation
 startUp = function (data) {
    console.log(data.value);
 };

 var settings = require('cityhall')('http://path.to.server/api');
 settings.getVal({value: '/test/val1'}, null, startUp);
```

