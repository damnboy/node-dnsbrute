/*
该模块负责对目标域名进行基于字典的暴破解

examples:
        var target = brute({
            'target' : argvs.domain
            'nameservers' : nameservers, //可选，自定义公共DNS服务器，
            'parallel' : options.parallel, //可选，并发解析数量
            'delay' : options.delay //可选，解析请求间隔
            
        })
        .then(function(chain){
            // Add you custom Stream Object(Transform || Writable) Here 
        })
        .catch(function(err){
            console.log(err)
        })
*/
var path = require('path');
var transform = require('parallel-transform');
var list = require('../list-streams');
var co = require('co');
var authorities = require('./authority')


function brute(options){    
    var dnsRequest = require('./dnsrequest').createDNSRequester();
    
    var t = transform(options.parallel || 1, {}, (function(){
    
        function getAuthorityA(domain, ns/*, parse*/){
    
            var nameservers = ns || ROOT_NAME_SERVERS;
            var trace = []; // 记录所有DNS响应
            //var parse = parse || function(response){
            //  return response
            //};
        
            return co(function *recursive(){
                do{
                    var r = {
                        type : 'A',
                        nameserver : nameservers[Math.round(Math.random()*10) % nameservers.length],
                        domain : domain
                    } 
                    var response = yield dnsRequest(r);
                    trace.push(response);
        
                    //如果A记录的响应中出现了additionals或authorities 则表示这条A记录可能关联额外的DNS服务器信息
                    if(response.additionals.length > 0){
                        nameservers = response.additionals.reduce(function(curr, record){
                            if(record.type === 'A'){
                            //logger.info(record.name , record.data)
                            curr.push(record.data);
                            }
                            return curr;
                        }, []);
                    }
                    else{
                        nameservers = response.authorities.reduce(function(curr, record){
                            if(record.type === 'NS'){
                                //logger.info(record.name , record.data)
                                curr.push(record.data);
                            }
                            return curr;
                        }, [])
                    }
        
                    if(response.rcode !== 'NOERROR' || response.flag_aa){
                        break;
                    }
                }
                while(true)
        
                var lastResponse = trace[trace.length - 1];
                // add trace attribute for future analyze
                lastResponse.trace = trace;

                if(response.rcode === 'NOERROR' && lastResponse.flag_aa){
                    return lastResponse;
                }
        
                //For crypto only, Error objects will include the OpenSSL error stack in a separate property called opensslErrorStack if it is available when the error is thrown.
                //So do we ;)
                var error = new Error('[' + lastResponse.rcode + '] ' + domain );
                error.response = lastResponse;
                throw error;
            })
        }
    
    
        return function(suffix, callback){
            
            var domain = suffix.toString('utf-8') + '.' + options.target;
    
            (function(seconds){
                return new Promise(function(resolve, reject){
                    var nameserver = options.nameservers[Math.round(Math.random()*10) % options.nameservers.length];

                    var timer = setTimeout(function(){
                        resolve({name:domain, nameserver: nameserver, timeout:true});
                    }, seconds);
    
                    getAuthorityA(domain, [nameserver])
                    .then(function(response){
                        clearTimeout(timer);
                    
                        resolve(response)
                    })
                    .catch(function(error){
                        clearTimeout(timer);
                        // add error attribute to response object
                        reject(error);
                    })
    
                })
            })(options.timeout || 5000)
            .then(function(response){
                setTimeout(function(){
                    callback(null, response);
                }, options.delay || 30);
            })
            .catch(function(error){
                // response with error attribute
                setTimeout(function(){
                    callback(null, error);
                }, options.delay || 30);
            })   
        }
    })());
    
    t.on('finish', function(){
        dnsRequest();
    });

    var dict = list.createListStream(options.dict);  

    return dict.pipe(t);
};


module.exports = function(options){
    var dig = options.nameservers ? Promise.resolve(options.nameservers) : authorities(options.target)
    return dig
    .then(function(nameservers){

        var chain = brute({
            'target' : options.target,
            'nameservers' : nameservers,
            'parallel' : options.parallel || nameservers.length ,
            'delay' : options.delay,
            'dict' : path.basename(options.dict || 'dict.txt')
        });

        return Promise.resolve(chain);
    })
}

