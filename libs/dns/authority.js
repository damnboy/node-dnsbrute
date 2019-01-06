/*

该模块负责递归获取目标的域名的权威DNS服务器信息


example:
    getAuthorityNS('google.com')
    .then(function(response){

    })
    .catch(function(error){
        console.log(error)
    })
*/


const co = require('co');
var dnsrequest = require('./dnsrequest').createDNSRequester();

//https://en.wikipedia.org/wiki/Root_name_server顶级域名服务器
var ROOT_NAME_SERVERS = [
    '198.41.0.4',  /*     
    '192.228.79.201',
    '192.33.4.12',
    '199.7.91.13',
    '192.203.230.10',
    '192.5.5.241',
    '192.112.36.4',
    '198.7.190.53',
    '192.36.148.17',
    '192.58.128.30',
    '193.0.14.129',
    '199.7.83.42',
    '202.12.27.33'*/
];

function getAuthorityNS(domain){

    var nameservers = ROOT_NAME_SERVERS;
    var trace = []; // 记录所有DNS响应
    return co(function *recursive(){
        do{
            var server = nameservers[Math.round(Math.random()*10) % nameservers.length];
            console.log('digging authorities of ' +  domain + ' via ' + server);
            var response = yield dnsrequest({
                type : 'NS',
                nameserver : server,
                domain : domain
                });

                trace.push(response);

            //从additional中抽取 域名 & ip信息
            if(response.additionals.length > 0){
                nameservers = response.additionals.reduce(function(curr, record){
                    if(record.type === 'A'){
                        //logger.info(record.name , record.data)
                        curr.push(record.data);
                    }
                    return curr;
                }, []);
            }
            //无additional信息，尝试从authorities与answers抽取ns记录，进行递归解析
            else{
                var section = response.authorities.length === 0 ? response.answers :response.authorities;
                nameservers = section.reduce(function(curr, record){
                    if(record.type === 'NS'){
                        //logger.info(record.name , record.data)
                        curr.push(record.data);
                    }
                    return curr;
                }, []);
            }

            //权威应答
            if(response.flag_aa || response.rcode !== 'NOERROR' ){
                break;
            }
        }
        while(true);

        dnsrequest() //关闭所创建的UDP socket
        
        var lastReqponse = trace[trace.length - 1];

        if(lastReqponse.rcode !== 'NOERROR'){
            throw new Error(lastReqponse.rcode)
        }

        if(lastReqponse.flag_aa){
            return nameservers;
        }

    })
}

module.exports = getAuthorityNS;