/*
 * OVHWS - JSONP request
 * 
 * @version : 1.0
 * @creator : Kevin Bonduelle
 *
 * @description : Provide OVH Signed JSONP Request 
*/
function OVHWS(options){
    "use strict";

    // Some useful variable
    var _WSURL_ = 'https://ws.ovh.com';
    var _SESSIONHANDLERPATH_ = 'sessionHandler/r3/ws.dispatcher';
    var _SEPARATOR_ = '+';

    // All events
    //For Login Request
    this.onLoginRequest  = function(url, data){};
    this.onLoginSuccess  = function(session){};
    this.onLoginComplete = function(success, response){};
    this.onLoginTimeout  = function(){}; 
    this.onLoginCancel   = function(){}; 
    this.onLoginError    = function(response, message){};

    //For Call WS
    this.onRequest       = function(url, data){};
    this.onSuccess       = function(session){};
    this.onComplete      = function(success, response){};
    this.onTimeout       = function(){}; 
    this.onError         = function(response, message){};

    this.sessions = {};

    // fixe scope
    var _me = this;

    //Constructor
    function _initialize()
    {
        "use strict";
    
        if( window.location.port )
        {
           _me._sessionHandlerUrl = _WSURL_ + ':' + window.location.port + '/'  + _SESSIONHANDLERPATH_;
        }
        else {
            _me._sessionHandlerUrl = _WSURL_ + '/' + _SESSIONHANDLERPATH_;
        }

        // Override event
        for(var key in options)
        {
            if( options.hasOwnProperty(key) && _me.hasOwnProperty(key) )
            {
                _me[key] = options[key];
            }
        }
    }

    //stringify json    
    function _JSONEncode(obj)
    {
        "use strict";

        var objType = typeof(obj);
        var returnValue = "";

        if ( !obj )
        {
            returnValue = null;
        }
        else {
            if ( JSON.stringify  )
            {
                returnValue = JSON.stringify(obj);
            }
            else {
                if(objType == "string")
                {
                    returnValue = '"' + obj.replace(/[\x00-\x1f\\"]/g, escape) + '"';
                }
                else {
                    if ( objType == "number" || objType == "boolean" )
                    {
                        returnValue = "" + obj;
                    }
                    else {
                        if (obj.length != undefined)
                        {
                            returnValue = "[" + obj.map(jsonencode) + "]";
                        }
                        else {
                            var buff = [], json = null;
                            for(var k in obj)
                            {
                                json = _JSONEncode(obj[k]);
                                if( json )
                                {
                                    buff.push(_JSONEncode(k) + ':' + json);
                                }
                                json = null;
                            }
                            returnValue = '{' + buff + '}';
                        } 
                    }
                }
            }
        }
        return returnValue;
    }

    function _URLEncode(obj){
        var queryString = [], value, qs = null, result, objType;
        for (var key in obj)
        {
            value = obj[key];
            result = "";
            objType = typeof(value);

            if (objType == 'object')
            {
                if( obj.length != undefined)
                {
                    qs = {};
                    for ( var i = 0 ; i < value.length ; i++)
                    {
                        qs[i] = value[i];
                    }
                    result = _URLEncode(qs, key);
                }
                else {
                    result =_URLEncode(value, key);
                }
            }
            else {
                result = key + '=' + encodeURIComponent(value);
            }

            if (value != null) queryString.push(result);
        }
        return queryString.join('&');
    }

    this._requests = {};
    this._requestsCounter = 0;

    //provide JSONP request
    function _JSONP(requestUrl, requestData, callback)
    {
        "use strict";

        //Create script
        var script = document.createElement('script');
        var index = _me._requestsCounter++;

        script.src = requestUrl +
            '?callback=OVHWS.prototype._requests.request_' + index +
            (requestData ? '&' + _URLEncode(requestData) : '');

        script.type = 'text/javascript';

        _me._requests['request_' + index] = function(){
            var response = arguments[0];
            callback(response);
        };

        OVHWS.prototype._requests = _me._requests;

        document.getElementsByTagName('head')[0].appendChild(script);
    }

    //call ws fonction
    this.call = function(options, callback, token)
    {
        "use strict";

        var url = options.url,
            token,
            nonce,
            params = options.params ? options.params : {},
            regex;

        //check params
        if( !url )
        {
            _me.onError(null,'No url found');

            return options;
        }
        else {
            regex = new RegExp(_WSURL_+':443|'+_WSURL_+':80');
            url = url.replace(regex, _WSURL_);
        }

        //classique call
        if( token === null || token === undefined )
        {
            _me.onRequest(url, params);
            
            _JSONP(url, {'params' : _JSONEncode(params)}, function(response){
                var hasError = false;
                if( response.answer === null || response.answer === undefined )
                {
                    if(response.error)
                    {
                        _me.onError(response, response.error.message);
                        hasError = true;
                    }
                }
                else {
                    _me.onSuccess(response.answer);
                }

                if(callback)
                {
                    callback(!hasError, response);
                }

                _me.onComplete(!hasError, response);
            });
        }
        else {

            if( params.sessionId === null || params.sessionId === undefined )
            {
                 _me.onError(null, 'Bad sessionId found');
                 this.fireEvent('error',
                {
                    'message' : 'Bad sessionId found'
                });
                return options;

            }

            nonce = Date.now() + '.' + Math.floor((Math.random()*1000)+1);

            var dataToSign = url + _SEPARATOR_ + _JSONEncode(params) + _SEPARATOR_ + nonce + _SEPARATOR_ + token;
            var sign = _me.SHA1(dataToSign.replace(/\s/g,''));

            var data =
            {
                'session'   : params.sessionId,
                'params'    : _JSONEncode(params),
                'sign'      : sign,
                'nonce'     : nonce
            };

            _me.onRequest(url, data);
            _JSONP(url, data, function(response)
            {
                var hasError = false;
                if( response.answer === null || response.answer === undefined  )
                {
                    if( response.error )
                    {
                        _me.onError(response, response.error.message);
                        hasError = true;
                    }
                }
                else {
                    _me.onSuccess(response.answer);
                }

                if( callback )
                {
                    callback(!hasError, response);
                }

                _me.onComplete(!hasError, response);
            });
        }
    };
    
    /**
    *
    *  Secure Hash Algorithm (SHA1)
    *  http://www.webtoolkit.info/
    *
    **/
    this.SHA1 = function(msg)
    {
        function rotate_left(n,s) {
            var t4 = ( n<<s ) | (n>>>(32-s));
            return t4;
        };
     
        function lsb_hex(val) {
            var str="";
            var i;
            var vh;
            var vl;
     
            for( i=0; i<=6; i+=2 ) {
                vh = (val>>>(i*4+4))&0x0f;
                vl = (val>>>(i*4))&0x0f;
                str += vh.toString(16) + vl.toString(16);
            }
            return str;
        };
     
        function cvt_hex(val) {
            var str="";
            var i;
            var v;
     
            for( i=7; i>=0; i-- ) {
                v = (val>>>(i*4))&0x0f;
                str += v.toString(16);
            }
            return str;
        };
     
     
        function Utf8Encode(str) {
            str = str.replace(/\r\n/g,"\n");
            var utftext = "";
     
            for (var n = 0; n < str.length; n++)
            {
     
                var c = str.charCodeAt(n);
     
                if (c < 128)
                {
                    utftext += String.fromCharCode(c);
                }
                else if((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
                else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
            }
            return utftext;
        };
     
        var blockstart;
        var i, j;
        var W = new Array(80);
        var H0 = 0x67452301;
        var H1 = 0xEFCDAB89;
        var H2 = 0x98BADCFE;
        var H3 = 0x10325476;
        var H4 = 0xC3D2E1F0;
        var A, B, C, D, E;
        var temp;
     
        msg = Utf8Encode(msg);

        var msg_len = msg.length;
     
        var word_array = new Array();
        for( i = 0 ; i < msg_len - 3 ; i += 4 )
        {
            j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i+1) << 16 | msg.charCodeAt(i+2) << 8 | msg.charCodeAt(i+3);
            word_array.push( j );
        }
     
        switch( msg_len % 4 )
        {
            case 0:
                i = 0x080000000;
            break;
            case 1:
                i = msg.charCodeAt(msg_len-1)<<24 | 0x0800000;
            break;
     
            case 2:
                i = msg.charCodeAt(msg_len-2)<<24 | msg.charCodeAt(msg_len-1)<<16 | 0x08000;
            break;
     
            case 3:
                i = msg.charCodeAt(msg_len-3)<<24 | msg.charCodeAt(msg_len-2)<<16 | msg.charCodeAt(msg_len-1)<<8    | 0x80;
            break;
        }
     
        word_array.push( i );
     
        while( (word_array.length % 16) != 14 ) word_array.push( 0 );
     
        word_array.push( msg_len>>>29 );
        word_array.push( (msg_len<<3)&0x0ffffffff );
     
     
        for ( blockstart=0; blockstart<word_array.length; blockstart+=16 ) {
     
            for( i=0; i<16; i++ ) W[i] = word_array[blockstart+i];
            for( i=16; i<=79; i++ ) W[i] = rotate_left(W[i-3] ^ W[i-8] ^ W[i-14] ^ W[i-16], 1);
     
            A = H0;
            B = H1;
            C = H2;
            D = H3;
            E = H4;
     
            for( i= 0; i<=19; i++ ) {
                temp = (rotate_left(A,5) + ((B&C) | (~B&D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B,30);
                B = A;
                A = temp;
            }
     
            for( i=20; i<=39; i++ ) {
                temp = (rotate_left(A,5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B,30);
                B = A;
                A = temp;
            }
     
            for( i=40; i<=59; i++ ) {
                temp = (rotate_left(A,5) + ((B&C) | (B&D) | (C&D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B,30);
                B = A;
                A = temp;
            }
     
            for( i=60; i<=79; i++ ) {
                temp = (rotate_left(A,5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B,30);
                B = A;
                A = temp;
            }
     
            H0 = (H0 + A) & 0x0ffffffff;
            H1 = (H1 + B) & 0x0ffffffff;
            H2 = (H2 + C) & 0x0ffffffff;
            H3 = (H3 + D) & 0x0ffffffff;
            H4 = (H4 + E) & 0x0ffffffff;
     
        }
     
        var temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
     
        return temp.toLowerCase();
    };

    _initialize(); 
};
/*global OVHWS*/
/*
 * OVHWS-Wrapper-Common 
 * 
 * @version : 1.0
 * @creator : Kevin Bonduelle
 *
 * @description : Somme common tool for OVHWSWrapper 
*/

(function()
{

function isDebug()
{
    //return window.location.port.length > 3;
    return true;
};

if( !window.Ovhws )
{
    window.Ovhws = function OVHWSWrapper(){};

    if( !window.console || !isDebug() )
    {
        Ovhws.prototype.console = {
            log : function(){},
            debug : function(){}
        };
    }
    else{
        if( window.console.debug )
        {
            Ovhws.prototype.console = window.console;
        }
        else {
            Ovhws.prototype.console = {
                log : window.console.log,
                debug : window.console.log
            };
        }
    }

    var console = Ovhws.prototype.console;

    if( isDebug() )
    {
        Ovhws.prototype._port = window.location.port;
        console.debug('We are on DevEnv : ',window.location.port );
    }
    else {
        Ovhws.prototype._port = '';
    }
}

if( !window.Ows )
{
Ovhws.prototype._call = function()
{
    console.debug('Start calling function with arguments', arguments);

    var fname, func, url, callback, params, _prefix, token;
  
    if( arguments[2] === null || arguments[2] === undefined )
    {
        params = {};
    }
    else {
        params = arguments[2];
    }

    if( arguments[3] === null || arguments[3] === undefined )
    {
        callback = function(){};
    }
    else {
        callback = arguments[3];
    }

    if(arguments[4] === null || arguments[4] === undefined)
    {
        token = undefined;
    }
    else {
        token = arguments[4];
    }

    if( arguments && arguments[0] && arguments[1] )
    {
        _prefix = arguments[0];
        console.debug('function prefix', _prefix);

        fname = arguments[1];
        console.debug('function name', fname);

        func = Ovhws.prototype[_prefix][fname];
        console.debug('function description object', func);

        url = Ovhws.prototype[_prefix].servicesInformations.defaultUrl + '/' + fname;

        console.debug('function url', url);

        console.debug('params', params);

        if( func )
        {
            Ovhws.prototype.request.call({
                'url' : url,
                'params' : params 
            },function(success, response)
            {
                callback(success, response);
                if(response.token != null)
                {
                   Ovhws.prototype[_prefix].sessions[response.answer.id] = response.token;
                }
                console.debug('Request complete', arguments);
            },token);
        }
        else {
            throw "Function " + fname + ' not exists.';
        }
    }
    else {
        throw "Missing arguments.";
    }
}

Ovhws.prototype._getForm = function(prefix, fname, params, options)
{
    if( !options )
    {
        options = {
            labelClass : 'Ows-label',
            fieldClass :  'Ows-field'
        };
    }

    var form = document.createElement('form');
    form.setAttribute('id', prefix+'_'+fname);

    //apply some options

    //end apply some options

    var label, input, id, fieldset, legend, button;

    fieldset = document.createElement('fieldset');
    fieldset.style.cssFloat = 'left';
    legend = document.createElement('legend');
    legend.innerHTML = fname;
    fieldset.appendChild(legend);    

    for(var p in params)
    {
        id = prefix + '_' + fname + '_' + p;
        console.log(params[p].required);
        label = document.createElement('label');
        label.innerHTML = p + ' ';
        if(params[p].required != undefined && params[p].required == true)
        {
            label.innerHTML += '* ';
        }
        label.setAttribute('for', id);
        label.setAttribute('class', options.labelClass);
        fieldset.appendChild(label);

        input = document.createElement('input');

        if(p == 'password')
        {
            input.setAttribute('type', 'password');
        }
        else {
            input.setAttribute('type', 'text');
        }

        input.id = id;

        input.setAttribute('class', options.fieldClass);

        fieldset.appendChild(input);

        fieldset.appendChild(document.createElement('br'));
        fieldset.appendChild(document.createElement('br'));
    }

    button = document.createElement('button');
    button.id = prefix + '_' + fname + '_button';
    button.innerHTML = fname;
    button.onclick = function(evt)
    {

        evt.stopPropagation();
        evt.preventDefault();

        var parameters = {},
            inputs = document.getElementById(prefix+'_'+fname).getElementsByTagName('input'),
            idTab, id;
        for(var i = 0 ; i < inputs.length ; i++)
        {
            idTab = inputs[i].id.split('_');
            id = idTab[idTab.length-1];
            parameters[id] = inputs[i].value;
        }

        document.getElementById(prefix+'_'+fname+'_result').innerHTML = 'Loading...';
        Ows[prefix][fname].call(parameters, function(success, response)
        {
        document.getElementById(prefix+'_'+fname+'_result').innerHTML = JSON.stringify(response,null,'&#160;&#160;&#160;&#160;');    
        });

        return false;
    } 
    fieldset.appendChild(button);
    form.appendChild(fieldset);

    //create the result part
    fieldset = document.createElement('fieldset');
    fieldset.style.minHeight = '98px';

    legend = document.createElement('legend');
    legend.innerHTML = fname + ' result';

    var pre = document.createElement('pre');
    pre.id = prefix+'_'+fname+'_result';
    
    fieldset.appendChild(legend);
    fieldset.appendChild(pre);

    form.appendChild(fieldset);
    form.style.clear = 'both';

    return form; 
}

window.Ows = new Ovhws();

}
})();

/*global OVHWS*/
/*
* OVHWS-Wrapper - cloudnas
*/
(function()
{
    'use strict';

    var commonUrl = 'https://ws.ovh.com/OVHWS-Wrapper-Common.js',
    console;

    if(!window.Ovhws.request){
        Ovhws.prototype.request = new OVHWS();
    }

    console = window.Ovhws.prototype.console;

    addToPrototype();



    function addToPrototype(){

        var OVHWSWrapper = window.Ovhws;
        OVHWSWrapper.prototype.cloudnas = {};

        OVHWSWrapper.prototype.cloudnas.servicesInformations = {
            defaultUrl  : "https://ws.ovh.com/cloudnas/r3/ws.dispatcher",
            version     : "r3"
        };

        if( OVHWSWrapper.prototype._port != ""  )
        {
            OVHWSWrapper.prototype.cloudnas.servicesInformations.defaultUrl = 'https://ws.ovh.com:' + OVHWSWrapper.prototype._port + '/cloudnas/r3/ws.dispatcher';
        }
        /*
        Function : getHubicAgreements
        */
        OVHWSWrapper.prototype.cloudnas.getHubicAgreements =
        {
           "parameters":{
              "country":{
                 "required":true,
                 "type":"string"
              },
              "textVersion":{
                 "type":"boolean",
                 "description":"show/hide text version of contracts"
              },
              "sessionId":{
                 "required":true,
                 "type":"string"
              },
              "type":{
                 "required":true,
                 "$ref":"cloudnasType:accountTypeEnum"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{
              "$ref":"cloudnasType:contractList"
           },
           "sessionOptions":[
              "allowAnonymousSession"
           ],
           "description":"return hubic agreements"
        }
        OVHWSWrapper.prototype.cloudnas.getHubicAgreements.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'getHubicAgreements', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.getHubicAgreements.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'getHubicAgreements', OVHWSWrapper.prototype.cloudnas.getHubicAgreements.parameters, arguments[0]);
        }
        /*
        Function : getCredentials
        */
        OVHWSWrapper.prototype.cloudnas.getCredentials =
        {
           "parameters":{
              "sessionId":{
                 "required":true,
                 "type":"string"
              },
              "accountName":{
                 "type":"string"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{
              "$ref":"cloudnasType:cloudNasCredentials"
           },
           "sessionOptions":[],
           "description":"return user and pass to connect to cloudnas account"
        }
        OVHWSWrapper.prototype.cloudnas.getCredentials.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'getCredentials', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.getCredentials.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'getCredentials', OVHWSWrapper.prototype.cloudnas.getCredentials.parameters, arguments[0]);
        }
        /*
        Function : getNas
        */
        OVHWSWrapper.prototype.cloudnas.getNas =
        {
           "parameters":{
              "sessionId":{
                 "required":true,
                 "type":"string"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{
              "$ref":"cloudnasType:cloudNasAccountList"
           },
           "sessionOptions":[],
           "description":"hubic summary infos"
        }
        OVHWSWrapper.prototype.cloudnas.getNas.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'getNas', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.getNas.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'getNas', OVHWSWrapper.prototype.cloudnas.getNas.parameters, arguments[0]);
        }
        /*
        Function : nasLogin
        */
        OVHWSWrapper.prototype.cloudnas.nasLogin =
        {
           "parameters":{
              "email":{
                 "required":true,
                 "type":"string",
                 "description":"Can be the nichandle or the associated email"
              },
              "password":{
                 "required":true,
                 "type":"string"
              }
           },
           "sessionNamespace":[],
           "returns":{
              "$ref":"sessionType:session"
           },
           "sessionOptions":[
              "sessionLess"
           ],
           "description":"hubic login function"
        }
        OVHWSWrapper.prototype.cloudnas.nasLogin.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'nasLogin', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.nasLogin.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'nasLogin', OVHWSWrapper.prototype.cloudnas.nasLogin.parameters, arguments[0]);
        }
        /*
        Function : getPublicationInformations
        */
        OVHWSWrapper.prototype.cloudnas.getPublicationInformations =
        {
           "parameters":{
              "publicationId":{
                 "required":true,
                 "type":"string"
              }
           },
           "sessionNamespace":[],
           "returns":{
              "$ref":"cloudnasType:publicationInformations"
           },
           "sessionOptions":[
              "sessionLess"
           ],
           "description":"Return publication informations. used by publication site"
        }
        OVHWSWrapper.prototype.cloudnas.getPublicationInformations.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'getPublicationInformations', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.getPublicationInformations.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'getPublicationInformations', OVHWSWrapper.prototype.cloudnas.getPublicationInformations.parameters, arguments[0]);
        }
        /*
        Function : createHubicAccount
        */
        OVHWSWrapper.prototype.cloudnas.createHubicAccount =
        {
           "parameters":{
              "password":{
                 "type":"string",
                 "description":"not required if session is not anonymous"
              },
              "sessionId":{
                 "required":true,
                 "type":"string"
              },
              "user":{
                 "description":"not required if session is not anonymous",
                 "$ref":"cloudnasType:userData"
              },
              "type":{
                 "required":true,
                 "description":"free, standard, extended",
                 "$ref":"cloudnasType:accountTypeEnum"
              },
              "acceptAgreement":{
                 "required":true,
                 "type":"boolean"
              },
              "accountName":{
                 "type":"string",
                 "description":"by default will be called 'default'"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{
              "$ref":"cloudnasType:creationStatus"
           },
           "sessionOptions":[
              "allowAnonymousSession"
           ],
           "description":"create hubic account using valid nic session, is session is anonymous, 'user' must be provided, otherwise user from session is taken"
        }
        OVHWSWrapper.prototype.cloudnas.createHubicAccount.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'createHubicAccount', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.createHubicAccount.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'createHubicAccount', OVHWSWrapper.prototype.cloudnas.createHubicAccount.parameters, arguments[0]);
        }
        /*
        Function : reportAbuse
        */
        OVHWSWrapper.prototype.cloudnas.reportAbuse =
        {
           "parameters":{
              "comment":{
                 "required":true,
                 "type":"string"
              },
              "url":{
                 "required":true,
                 "type":"string"
              },
              "contact":{
                 "required":true,
                 "type":"string"
              },
              "abuseCategory":{
                 "required":true,
                 "type":"string"
              }
           },
           "sessionNamespace":[],
           "returns":{},
           "sessionOptions":[
              "sessionLess"
           ],
           "description":"STUB: report abuse"
        }
        OVHWSWrapper.prototype.cloudnas.reportAbuse.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'reportAbuse', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.reportAbuse.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'reportAbuse', OVHWSWrapper.prototype.cloudnas.reportAbuse.parameters, arguments[0]);
        }
        /*
        Function : resendActivationEmail
        */
        OVHWSWrapper.prototype.cloudnas.resendActivationEmail =
        {
           "parameters":{
              "sessionId":{
                 "required":true,
                 "type":"string"
              },
              "accountName":{
                 "required":true,
                 "type":"string"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{
              "type":"boolean"
           },
           "sessionOptions":[],
           "description":"resend activation email"
        }
        OVHWSWrapper.prototype.cloudnas.resendActivationEmail.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'resendActivationEmail', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.resendActivationEmail.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'resendActivationEmail', OVHWSWrapper.prototype.cloudnas.resendActivationEmail.parameters, arguments[0]);
        }
        /*
        Function : isAccountCreated
        */
        OVHWSWrapper.prototype.cloudnas.isAccountCreated =
        {
           "parameters":{
              "email":{
                 "required":true,
                 "type":"string"
              },
              "sessionId":{
                 "required":true,
                 "type":"string"
              },
              "accountName":{
                 "type":"string"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{
              "type":"boolean"
           },
           "sessionOptions":[
              "allowAnonymousSession"
           ],
           "description":"checks if cloudnas account is ready to use"
        }
        OVHWSWrapper.prototype.cloudnas.isAccountCreated.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'isAccountCreated', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.isAccountCreated.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'isAccountCreated', OVHWSWrapper.prototype.cloudnas.isAccountCreated.parameters, arguments[0]);
        }
        /*
        Function : sendNicListFromEmail
        */
        OVHWSWrapper.prototype.cloudnas.sendNicListFromEmail =
        {
           "parameters":{
              "email":{
                 "required":true,
                 "type":"string"
              },
              "sessionId":{
                 "required":true,
                 "type":"string"
              },
              "language":{
                 "required":true,
                 "type":"string"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{
              "type":"boolean"
           },
           "sessionOptions":[
              "allowAnonymousSession"
           ],
           "description":"send an email with nic list"
        }
        OVHWSWrapper.prototype.cloudnas.sendNicListFromEmail.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'sendNicListFromEmail', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.sendNicListFromEmail.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'sendNicListFromEmail', OVHWSWrapper.prototype.cloudnas.sendNicListFromEmail.parameters, arguments[0]);
        }
        /*
        Function : checkEnigma
        */
        OVHWSWrapper.prototype.cloudnas.checkEnigma =
        {
           "parameters":{
              "answer":{
                 "required":true,
                 "type":"string"
              },
              "publicationId":{
                 "required":true,
                 "type":"string"
              }
           },
           "sessionNamespace":[],
           "returns":{
              "type":"string"
           },
           "sessionOptions":[
              "sessionLess"
           ],
           "description":"enigma check"
        }
        OVHWSWrapper.prototype.cloudnas.checkEnigma.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'checkEnigma', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.checkEnigma.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'checkEnigma', OVHWSWrapper.prototype.cloudnas.checkEnigma.parameters, arguments[0]);
        }
        /*
        Function : createPublicationUrl
        */
        OVHWSWrapper.prototype.cloudnas.createPublicationUrl =
        {
           "parameters":{
              "publicationParameters":{
                 "$ref":"cloudnasType:publicationParameters"
              },
              "sessionId":{
                 "required":true,
                 "type":"string"
              },
              "comment":{
                 "type":"string"
              },
              "fileResource":{
                 "required":true,
                 "type":"string"
              },
              "accountName":{
                 "required":true,
                 "type":"string"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{
              "$ref":"cloudnasType:publishUrl"
           },
           "sessionOptions":[],
           "description":"STUB: create new publication"
        }
        OVHWSWrapper.prototype.cloudnas.createPublicationUrl.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'createPublicationUrl', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.createPublicationUrl.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'createPublicationUrl', OVHWSWrapper.prototype.cloudnas.createPublicationUrl.parameters, arguments[0]);
        }
        /*
        Function : destroyPublication
        */
        OVHWSWrapper.prototype.cloudnas.destroyPublication =
        {
           "parameters":{
              "sessionId":{
                 "required":true,
                 "type":"string"
              },
              "fileResource":{
                 "required":true,
                 "type":"string"
              },
              "accountName":{
                 "type":"string"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{},
           "sessionOptions":[],
           "description":"destroy a publication"
        }
        OVHWSWrapper.prototype.cloudnas.destroyPublication.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'destroyPublication', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.destroyPublication.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'destroyPublication', OVHWSWrapper.prototype.cloudnas.destroyPublication.parameters, arguments[0]);
        }
        /*
        Function : isEmailAvailableExtended
        */
        OVHWSWrapper.prototype.cloudnas.isEmailAvailableExtended =
        {
           "parameters":{
              "email":{
                 "required":true,
                 "type":"string"
              },
              "sessionId":{
                 "required":true,
                 "type":"string"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{
              "$ref":"cloudnasType:emailAvailabilityStatusEnum"
           },
           "sessionOptions":[
              "allowAnonymousSession"
           ],
           "description":"check if email is available and if it is linked to any nic"
        }
        OVHWSWrapper.prototype.cloudnas.isEmailAvailableExtended.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'isEmailAvailableExtended', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.isEmailAvailableExtended.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'isEmailAvailableExtended', OVHWSWrapper.prototype.cloudnas.isEmailAvailableExtended.parameters, arguments[0]);
        }
        /*
        Function : activateFeature
        */
        OVHWSWrapper.prototype.cloudnas.activateFeature =
        {
           "parameters":{
              "featureName":{
                 "required":true,
                 "type":"string"
              },
              "sessionId":{
                 "required":true,
                 "type":"string"
              },
              "featureCode":{
                 "required":true,
                 "type":"string"
              },
              "accountName":{
                 "required":true,
                 "type":"string"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{},
           "sessionOptions":[],
           "description":"activate new feature"
        }
        OVHWSWrapper.prototype.cloudnas.activateFeature.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'activateFeature', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.activateFeature.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'activateFeature', OVHWSWrapper.prototype.cloudnas.activateFeature.parameters, arguments[0]);
        }
        /*
        Function : getAllPublications
        */
        OVHWSWrapper.prototype.cloudnas.getAllPublications =
        {
           "parameters":{
              "sessionId":{
                 "required":true,
                 "type":"string"
              },
              "fileResource":{
                 "required":true,
                 "type":"string"
              },
              "accountName":{
                 "type":"string"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{
              "$ref":"cloudnasType:publishUrlList"
           },
           "sessionOptions":[],
           "description":"STUB: get all publications"
        }
        OVHWSWrapper.prototype.cloudnas.getAllPublications.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'getAllPublications', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.getAllPublications.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'getAllPublications', OVHWSWrapper.prototype.cloudnas.getAllPublications.parameters, arguments[0]);
        }
        /*
        Function : getHubicOffers
        */
        OVHWSWrapper.prototype.cloudnas.getHubicOffers =
        {
           "parameters":{
              "country":{
                 "required":true,
                 "type":"string"
              },
              "sessionId":{
                 "required":true,
                 "type":"string"
              },
              "language":{
                 "required":true,
                 "type":"string"
              }
           },
           "sessionNamespace":[
              "classic"
           ],
           "returns":{
              "$ref":"cloudnasType:hubicList"
           },
           "sessionOptions":[
              "allowAnonymousSession"
           ],
           "description":"STUB: return current hubic offers"
        }
        OVHWSWrapper.prototype.cloudnas.getHubicOffers.call = function() {
        OVHWSWrapper.prototype._call('cloudnas', 'getHubicOffers', arguments[0], arguments[1], arguments[2]);
        };

        OVHWSWrapper.prototype.cloudnas.getHubicOffers.getForm = function() {
        return OVHWSWrapper.prototype._getForm('cloudnas', 'getHubicOffers', OVHWSWrapper.prototype.cloudnas.getHubicOffers.parameters, arguments[0]);
        }
        console.log('OVHWSWrapper for "cloudnas" can be use.');
    }
})()