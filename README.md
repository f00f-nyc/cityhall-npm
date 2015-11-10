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
 var value = settings.getVal('/test/val1');
 ```

