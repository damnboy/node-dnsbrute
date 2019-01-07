# DNS

DNS tool use for enum & axfr target domain

## usage

### burst

bursting subdomain based on dict (./dict/dict.txt)

```
$ node ./ternimal domain --domain qq.com 
wildcards:  []
digging authorities of qq.com via 198.41.0.4
digging authorities of qq.com via 192.43.172.30
digging authorities of qq.com via 125.39.46.125
[ 'ns4.qq.com', 'ns1.qq.com', 'ns2.qq.com', 'ns3.qq.com' ]
IN.qq.com =>  [A] 0.0.0.1
a.qq.com =>  [CNAME] a.qq.com.cloud.tc.qq.com
aa.qq.com =>  [CNAME] aa.tc.qq.com
ab.qq.com =>  [CNAME] app.sparta.mig.tencent-cloud.net
aba.qq.com =>  [CNAME] aba.qq.com.cloud.tc.qq.com
abc.qq.com =>  [CNAME] sogou.proxy.qq.com
sogou.proxy.qq.com =>  [A] 123.151.179.162

```

you can use wildcards option filtering the A record

```
$ node ./ternimal domain --domain qq.com --wildcards "0.0.0.1"
wildcards:  []
digging authorities of qq.com via 198.41.0.4
digging authorities of qq.com via 192.43.172.30
digging authorities of qq.com via 125.39.46.125
[ 'ns4.qq.com', 'ns1.qq.com', 'ns2.qq.com', 'ns3.qq.com' ]
a.qq.com =>  [CNAME] a.qq.com.cloud.tc.qq.com
aa.qq.com =>  [CNAME] aa.tc.qq.com
ab.qq.com =>  [CNAME] app.sparta.mig.tencent-cloud.net
aba.qq.com =>  [CNAME] aba.qq.com.cloud.tc.qq.com
abc.qq.com =>  [CNAME] sogou.proxy.qq.com
sogou.proxy.qq.com =>  [A] 123.151.179.162
```

### axfr

Testing DNS Zone transfer on target domain

``` usage

$ node terminal.js  axfr --domain 189.cn 
digging authorities of 189.cn via 198.41.0.4
digging authorities of 189.cn via 203.119.29.1
digging authorities of 189.cn via 118.85.203.176
[ '118.85.203.176', '118.85.203.178' ]
testing axfr on 118.85.203.176
testing axfr on 118.85.203.178
118.85.203.176 REFUSED 0
118.85.203.178 REFUSED 0

```


## [Finding Authority Records](https://www.inetdaemon.com/tutorials/internet/dns/servers/authoritative.shtml)

using the [root name servers](//https://en.wikipedia.org/wiki/Root_name_server顶级域名服务器) for target domain authoriy records finding

DNS Response Parsing

* Authority Section (authoriy records, type: NS)

```
;; AUTHORITY SECTION:
qq.com.			172800	IN	NS	ns1.qq.com.
qq.com.			172800	IN	NS	ns2.qq.com.
qq.com.			172800	IN	NS	ns3.qq.com.
qq.com.			172800	IN	NS	ns4.qq.com.

```


* Additional Section（A or AAAA records map to the authoriy records）

```
;; ADDITIONAL SECTION:
ns1.qq.com.		172800	IN	A	101.89.19.165
ns1.qq.com.		172800	IN	A	157.255.246.101
ns2.qq.com.		172800	IN	A	121.51.160.46
ns2.qq.com.		172800	IN	A	123.151.66.78
ns2.qq.com.		172800	IN	A	203.205.176.236
ns3.qq.com.		172800	IN	A	112.60.1.69
ns3.qq.com.		172800	IN	A	183.192.201.116
ns4.qq.com.		172800	IN	A	125.39.46.125
ns4.qq.com.		172800	IN	A	184.105.206.124
ns4.qq.com.		172800	IN	A	203.205.220.27
ns4.qq.com.		172800	IN	A	58.144.154.100
ns4.qq.com.		172800	IN	A	59.36.132.142
```

based on the different configuration on differect DNS server, the digging process is totally differece. so we keep the whole responses in the digging process for futher analyze.


the digging process stopped until we met those conditions

* flag.aa === ture in response (the response comes from authoriy server)
* rcode !== NOERROR in response (something goes wrong)

```
https://tools.ietf.org/html/rfc1035 
  
response._flags = {
'rcode':  response.flags & 0x000f,            //标示本次dns响应的状态，0标示无错误，非0标示存在错误
'z':  		(response.flags >> 4) & 0x8,
'ra':  		(response.flags >> 7) & 0x1,       //Recursion Available
'rd':  		(response.flags >> 8) & 0x1,       //Recursion Desired
'tc':  		(response.flags >> 9) & 0x1,       //Truncated Response
'aa':  		(response.flags >> 10) & 0x1,      //Authoritative Answer
'opcode':	(response.flags >> 11) & 0xf,      //Standards Action
'qr':  		(response.flags >> 15) & 0x1,      //0 query，1 response
}
```

the implementation of finding authority records is in __./lib/dns/authority.js__


## Finding subdomain

### finding A or AAAA based on custom dictionary
the implementation of finding subdomain is in __./lib/dns/burst.js__

### additional Authority Records
while digging the subdomain, we may find __hidden Authority Records__ 
which appears in the AUTHORITY SECTION & ADDITIONAL SECTION of subdomain digging response

```

;; AUTHORITY SECTION:
music.189.cn.           28800   IN      NS      ns2.music.189.cn.
music.189.cn.           28800   IN      NS      ns1.music.189.cn.
  
;; ADDITIONAL SECTION:
ns1.music.189.cn.       28800   IN      A       118.85.203.41
ns2.music.189.cn.       28800   IN      A       125.88.75.134
           
```


# TODO

* Add TCP Support

# REMAEK

if you have any problem or if you got bugs with this lib, please contact me with github links in package.json ;)