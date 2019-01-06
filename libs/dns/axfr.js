
var bluebird = require('bluebird');
const dnsPacket = require('dns-packet')
const net = require('net')
var authority = require('./authority');

function _axfr(domain, nameserver){
    return new Promise(function(resolve, reject){
        var response = null
        var expectedLength = 0

        const client = new net.Socket()
        client.connect(53, nameserver, function () {
            //console.log('Connected')

            const buf = dnsPacket.streamEncode({
                type: 'query',
                id: (function(min, max) {
                    return Math.floor(Math.random() * (max - min + 1)) + min
                })(1, 65534),
                flags: dnsPacket.RECURSION_DESIRED,
                questions: [{
                    type: 'axfr',
                    name: domain
                }]
            })

            client.write(buf)
        })
    
        client.on('data', function (data) {
            //console.log('Received response: %d bytes', data.byteLength)
            if (response == null) {
                if (data.byteLength > 1) {
                const plen = data.readUInt16BE(0)
                //console.log(plen)
                expectedLength = plen
                if (plen < 12) {
                    throw new Error('below DNS minimum packet length')
                }
                response = Buffer.from(data)
                }
            } else {
                response = Buffer.concat([response, data])
            }
        
            if (response.byteLength > expectedLength) { //多两字节是什么毛病？
                response = dnsPacket.streamDecode(response);
                client.destroy();
                resolve(response);
            }
        })
    
        client.on('error', function(error){
            reject(error);
        })

        client.on('close', function () {
            
        })
    })
}

module.exports = function(domain){
    return authority(domain)
    .then(function(nameservers){
        console.log(nameservers)
        return bluebird.mapSeries(nameservers, function(ns){
            console.log('testing axfr on ' + ns)
            return _axfr(domain, ns)
            .then(function(response){
                response.ns = ns;
                return response;
            })
            .catch(function(err){
                console.log(ns, err);
                return err;
            })
        })
    })
    .catch(function(err){
        console.log(err);
    })
}

