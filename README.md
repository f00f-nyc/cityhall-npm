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
 startUp = function (data) {
    console.log(data.value);
 };

 var settings = require('cityhall')('http://path.to.server/api');
 settings.getVal('/test/val1', null, startUp);
```

You can also get multiple values, and in multiple ways, at once using:
```javascript
settings.getVal(
    {
        value1: {path: '/test/val1'},
        value2: {path: '/test/val2', environment: 'dev'},
        value3: {path: '/test/val3', override: 'cityhall'}
    },
    null, startUp);
```

