/*
    UDP Socket for DNS requests & responses

    1. using closure buffer the udp socket object
    2. self increse counter (up to 255) for dns id


    examples:

    1. sending dns request

    ```
    DNSRequest({
        type : 'NS',
        nameserver : '8.8.8.8'
        domain : 'google.com'
    })
    .then(function(response){

    })
    .catch(function(err){

    })
    ```

    2. closing the inner udp socket

    ```
        request()
    ```
*/

const dnsPacket = require('dns-packet');
const dgram = require('dgram');
var EventEmitter = require('events').EventEmitter;

function createDNSRequester(){
    var counter = 1;
    var router = new EventEmitter();
    const socket = dgram.createSocket('udp4');
  
    socket.on('message', message => {
        var packet = dnsPacket.decode(message);
        router.emit(packet.id, null, packet);
    });
  
    socket.on('error', function(err){
        router.emit(packet.id, err);
    })  
  
    socket.on('close', function(){
      //console.log('Client UDP socket closed : BYE!')
    })
    
    function _request(options){
      if(counter === 256){
          counter = 1
      }
      
      const buf = dnsPacket.encode({
          type: 'query',
          id: ++counter,
          flags: dnsPacket.RECURSION_DESIRED,
          questions: [{
            type: options.type,
            class: 'IN',
            name: options.domain
          }]
      });
  
      socket.send(buf, 0, buf.length, 53, options.nameserver);
      return { id: counter, router:router}
    }
  
    return function(options){
      if(!options){
        socket.close()
        return;
      }
      return new Promise(function(resolve, reject){
        var _r = _request(options);
        if(_r){
          _r.router.once(_r.id, function(err, packet){
            if(err){
              console.log('1', err)
              reject(err)
            }
            else{
              resolve(packet)
            }
          })
        }
      })
    }
}

module.exports = {
  createDNSRequester : createDNSRequester
}