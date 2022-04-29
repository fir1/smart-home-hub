
const MongoClient = require('mongodb').MongoClient;
const mosca = require('mosca'); //MQTT Broker package
const mqtt = require('mqtt'); //MQTT Client package
const myip = require('quick-local-ip'); //library to retrieve the local IP address of Raspberry Pi
const piinfo = require ('piinfo');//library will be used to retrieve the serial number of raspberry pi
var host=myip.getLocalIP4();//the local IP of Raspberry Pi. This IP should be used for MQTT Server
const serialPi = piinfo.serial();

//The URI for the MongoDB cloud database, which will be used to pull the data.
var uri="mongodb+srv://raspberrypi:uay6P2wUmk0MIdTp@smarthome-ogiob.mongodb.net/device?retryWrites=true";

console.log('serial Raspberry Pi: ' + piinfo.serial());
console.log("IP:"+ host);
 
//The settings for the MQTT server
var pubsubsettings = {
 type: 'mqtt',
 json: false,
 mqtt: require('mqtt'),
 host: host,
 port: 1883
};


var server = new mosca.Server(pubsubsettings);

var usernameMQTT="kasimovfirdavs"
var passwordMQTT="Iot@917211212"

// // Accepts the connection if the username and password are valid from clients ESP8266 
var authenticate = function(client, username, password, callback) {
  var authorized = (username === usernameMQTT && password.toString() === passwordMQTT);
  if (authorized) client.user = username;
  callback(null, authorized);
}

server.on('clientConnected', function(client) {
    console.log('Client Connected: ', client.id);
});

// fired when a client is disconnected
server.on('clientDisconnected', function(client) {
  console.log('Client Disconnected: ', client.id);
});

server.on('ready', setup);
// fired when the mqtt server is ready
function setup() {
  console.log('Mosca server is running');
  server.authenticate = authenticate;
}

var options = {
  username: usernameMQTT,
  password: passwordMQTT
};

const broker = 'mqtt://'+host; // MQTT Broker's hostname/IP address
var client  = mqtt.connect(broker,options); //connect the client to the broker with the credentials


/* Subscriber will listen to the specific topic from ESP8266.In case of ESP8266 publish topic is 'tele/ac_Living-Room/SENSOR'.
Then the MQTT broker will receive the message and save it to the database. This specific topic is for subscribing
to the temperature and the humidity of the Living Room
*/
client.subscribe('tele/ac_Living-Room/SENSOR');

/* The connection to the MongoDB database required, in order the central hub to work. The connection to the Database
of central hub will have limitation, the hub can not insert, delete, update or retrieve the sensible informations,
such as, the users credentials from the web application. This URI connection will only allow to insert the
temperatures and retrieve the updated state of Device which is associated to this Raspberry Pi's Serial Number.*/

MongoClient.connect(uri, function(err, connect) {
  if(err) { console.log(err);}

  const collection = connect.db("device").collection("devices");
  const changeStream = collection.watch([],{ fullDocument: 'updateLookup' });
  console.log("Connected to Db");

  /*ChangeStream is the function which MongoDB provides, it knowns when one of the informations of collection is 
  changed. It will be used in order to detect any updates from web application, such as, when the user clicks to
  turn on button the ChangeStream function knows that the content of the document is changed.  */
changeStream.on("change", function (res) {

  /*this required in order to check if operation is delete which means the device will be deleted and there is no
   need to send commands to ESP8266 chip, the messages should be published to the ESP8266 only if some information
   of devices changed, such as update operation */
    var operationType = res.operationType; 
    
    if(operationType==="update"){
        var updatedDeviceSerialPi=res.fullDocument.serialNumber; //the Serial number of Pi which the dev

          if (serialPi === updatedDeviceSerialPi) {
            console.log('COLLECTION CHANGED');
    var updatedDeviceName = res.fullDocument.name;
    var updatedDeviceState = res.fullDocument.state;
    var updatedDeviceStartTime = res.fullDocument.startTime;
    var updatedDeviceFinishTime = res.fullDocument.finishTime;
    var updatedDeviceType = res.fullDocument.typeDevice;

    console.log(updatedDeviceType+" "+updatedDeviceName+" state:"+updatedDeviceState+ " start:" + updatedDeviceStartTime+" end:" + updatedDeviceFinishTime);

            //Publish the state of the device to the ESP8266 device, either On or Off
            client.publish(('cmnd/'+updatedDeviceType+'_'+updatedDeviceName+'/power'), updatedDeviceState);
          }
        } 
  })
 

/* The MQTT client will listen any other messages from other clients, such as, ESP8266 chip which will send the data
about the temperature and humidity of living room. Once the message is received it will be saved on the database,
then this data will be used in front web application to display temp. and humidity of living room.
*/
client.on('message',function(topic, message, packet){
 
  let jsonData = JSON.parse(message);//parsing the received message of JSON, to the JavaScript object
  console.log("The data will be saved to Database: "+ message);
  const collection = connect.db("device").collection("temps");
    collection.insertOne({serialNumber: serialPi, date: new Date(), temperature: jsonData.AM2301.Temperature, humidity: jsonData.AM2301.Humidity });
});

});

