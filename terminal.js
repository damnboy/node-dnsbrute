
var Writable = require('stream').Writable;
var yargs = require('yargs');
var bluebird = require('bluebird');
var _ = require('lodash');
var brute = require('./libs/dns/brute');
var axfr = require('./libs/dns/axfr');
var authority = require('./libs/dns/authority');
var _argv = yargs.usage('Usage: $0 <command> [options]')
.strict()
.command((function(){
    return {
      command : "domain",
      describe : "子域暴力破解",
      builder : function(yargs) {
        return yargs
          .strict()
          .option('domain', {
            describe: '目标域名'
              , type: 'string'
              , demand: true
          })
          .option('wildcards', {
            describe: '泛解析地址 格式："1.1.1.1, 2.2.2.2"'
              , type: 'string'
              , demand: false
          })
      },
      handler : function(argvs){
        var wildcards = argvs.wildcards ? argvs.wildcards.split(',') : [];
        console.log('wildcards: ', wildcards);
        var target = brust({
            'target' : argvs.domain,
            /*
            'nameservers' : nameservers,
            'parallel' : options.parallel,
            'delay' : options.delay
            */
        })
        .then(function(chain){
        
            var terminal = new Writable({
                objectMode : true,
                highWaterMark : 16,
                write : function(data, encoding, next){ 
        
                    var response = data;

                    if(data instanceof Error){ //error occures
                        process.stderr.clearLine();
                        process.stderr.cursorTo(0);
                        var i = response.message.indexOf('NXDOMAIN');
                        if(response.message.indexOf('NXDOMAIN') === -1){
                            console.log(response.message);
                        }
                        else{
                            process.stderr.write(response.message);
                        }   
                        response = data.response;
                    }
                    else if(response.timeout){ //timeout
                        process.stderr.clearLine();
                        process.stderr.cursorTo(0);
                        console.log(response.name + ' => ' + ' [TIMEOUT] ' );
                    }
                    else{ //normal response
                        if(response.answers){
                            response.answers.forEach(function(a){
                                if(!_.includes(wildcards, a.data)){
                                    process.stderr.clearLine();
                                    process.stderr.cursorTo(0);
                                    console.log(a.name + ' => ' + ' [' + a.type + '] '  + a.data);
                                }  
                            })
                        }
                    }

                    if(response.trace && response.trace.length > 1){ // trace records > 1 means wo got a hidden nameserver ;)
                        response.trace.forEach(function(i){
                            // print hidden nameservers ~
                            if(i.additionals || i.authorities){
                                // saving hidden dns server to dns_hidden_nameservers
                                i.authorities.forEach(function(a){
                                    if(a.type === 'NS'){
                                        process.stderr.clearLine();
                                        process.stderr.cursorTo(0);
                                        console.log(a.name + ' => ' + ' [' + a.type + '] '  + a.data);
                                    }
                                })
                            }
                        })
                    }
        
                    next(null, data);
                }
            });
        
            terminal.on('finish', function(){
                process.stderr.clearLine();
                process.stderr.cursorTo(0);
            })
        
            chain.pipe(terminal);
        })
        .catch(function(err){
            console.log(err);
        })
      }
    }
})())
.command((function(){
    return {
        command : "axfr",
        describe : "域传送",
        builder : function(yargs) {
          return yargs
            .strict()
            .option('domain', {
              describe: '目标域名'
                , type: 'string'
                , demand: true
            })
        },
        handler : function(argvs){
            axfr(argvs.domain)
            .then(function(responses){
                responses.forEach(function(response){
                    if(response instanceof Error){

                    }
                    else{
                        console.log(response.ns, response.rcode, response.answers.length);
                    }
                })    
            })
            .catch(function(err){
                console.log(err)
            })

        }
    }
})())
.command((function(){
    return {
        command : "wildcard",
        describe : "泛解析",
        builder : function(yargs) {
          return yargs
            .strict()
            .option('domain', {
              describe: '目标域名'
                , type: 'string'
                , demand: true
            })
        },
        handler : function(argvs){
            var wildcards = [];
            console.log('wildcards: ', wildcards);
            var target = brute({
                'target' : argvs.domain,
                'dict' : 'wildcards.txt',
                'parallel' : 1,
                'delay' : 100
                
            })
            .then(function(chain){
            
                var terminal = new Writable({
                    objectMode : true,
                    highWaterMark : 16,
                    write : function(response, encoding, next){ 
                        if(response instanceof Error){
                            //console.log(response)
                        }
                        if(response.timeout){
                            console.log(response.name + ' => ' + ' [TIMEOUT] ' );
                        }
                        if(response.answers)
                        {
                            response.answers.forEach(function(i){
                                if(i.type === 'A'){
                                    wildcards.push(i.data);
                                }
                            })
                        }
                        
                        next(null, response);
                    }
                });
            
                terminal.on('finish', function(){
                    console.log(_.uniq(wildcards));
                })
            
                chain.pipe(terminal);
            })
            .catch(function(err){
                console.log(err);
            })

        }
    }
})())
.demandCommand(1, 'Must provide a valid command.')
.help('h', 'Show help.')
.argv;


