# The Central Hub
The Raspberry Pi will act as a central hub for smart home system. The main function of it to retrieve changes from database and send
that to the IoT appliances. Also, the hub will send the temperature and humidity of the room to the database.

## Installation
Install Node.js: https://nodejs.org/en/

then:
Install dependencies from bash or command prompt:
```
npm install
```
To run the server
```
node app.js
````



## Built with
- [Node.js](https://nodejs.org/en/)

## Dependencies
```
    "mongodb": "^3.2.3",
    "mosca": "^2.8.3",
    "mqtt": "^2.18.8",
    "piinfo": "0.0.2",
    "quick-local-ip": "^1.0.7"

```

## Authors
- Firdavs Kasymov

## License
This project is licensed under the MIT License
