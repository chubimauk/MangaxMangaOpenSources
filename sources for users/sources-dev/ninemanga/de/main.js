'use strict';
const rp = require('request-promise');
const $ = require('cheerio');

var source = require('./source.js');
var sources = {}; 

var deninemanga = require('./deninemanga.js');
var currentSources = {'deninemanga': {version: '1.0', location: 'default'}}; 

function loadDefaultSourcesShippedWithApp() {
    sources['deninemanga'] = new (deninemanga);
}

loadDefaultSourcesShippedWithApp();

function send_request(url){
    
    return rp(url)
    .then(function (htmlString) {
          // Process html...
          //console.log(htmlString);
          return htmlString;
          })
    .catch(function (err) {
           // Crawling failed...
           return err;
           });
}

//BROWSERIFY ONLY -- these must all be synchronous, make no requests (for now), can make requests with cors-anywhere proxy.. for now not necessary
function popularMangaRequest(source/*:String*/,page/*:Int*/){ //-> String or JSON.stringify(JSONBrowserifyRequest)
    var request = sources[source].popularMangaRequest(page);
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }
}

function popularMangaParse(source/*:String*/,page/*:Int*/, response/*:htmlString*/){ //-> JSONMangasPage
    return JSON.stringify(sources[source].popularMangaParse(page,response)); //JSON.stringify(response)?
}

function latestUpdatesRequest(source/*:String*/,page/*:Int*/){// -> String or JSON.stringify(JSONBrowserifyRequest)
    var request = sources[source].latestUpdatesRequest(page);
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }
}
function latestUpdatesParse(source/*:String*/,page/*:Int*/, response/*:htmlString*/){// -> JSONMangasPage
    return JSON.stringify(sources[source].latestUpdatesParse(page,response));
}

function searchMangaRequest(source/*:String*/,page/*:Int*/,query/*:String*/,params/*:String*/){// -> String or JSON.stringify(JSONBrowserifyRequest)
    //params will be ?key=value&key2=value2
    console.log("hitting pagedSearch");
    //console.log("query - ",req.params.query);
    //console.log("query params - ",req.query);
    
    var query = query;
    if (query == '--') {
        query = "";
    }
    
    console.log("final query for pagedsearch - searchMangaRequest is ", query);
    
    var filters = [];
    var sort = '';
    var sortDir = '';
    if (params.length > 0){
        var params = params.substring(1); //remove ?
        var keyValuePairs = params.split('&');
        for (const keyValuePair of keyValuePairs) {
            var keyAndValue = keyValuePair.split('=');
            if (keyAndValue.length == 2) {
                var key = keyAndValue[0];
                var value = keyAndValue[1];
                if(key == 'sort'){
                    sort = value;
                }
                else if(key == 'sortdir'){
                    sortDir = value;
                }
                else {
                filters.push({"key":key,"value":value});
                }
            }
        }
    }
    
    if(sort != '' && sortDir != ''){
        filters.push({"key":'sort',"value":sort,"direction":sortDir});
    }

    var request = sources[source].searchMangaRequest(page,query,filters);
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }

}

function searchMangaParse(source/*:String*/,page/*:Int*/, response/*:htmlString*/, query, params){// -> JSONMangasPage
    
    var query = query;
    if (query == '--') {
        query = "";
    }
    
    console.log("final query for pagedsearch - searchMangaRequest is ", query);
    
    var filters = [];
    var sort = '';
    var sortDir = '';
    if (params.length > 0){
        var params = params.substring(1); //remove ?
        var keyValuePairs = params.split('&');
        for (const keyValuePair of keyValuePairs) {
            var keyAndValue = keyValuePair.split('=');
            if (keyAndValue.length == 2) {
                var key = keyAndValue[0];
                var value = keyAndValue[1];
                if(key == 'sort'){
                    sort = value;
                }
                else if(key == 'sortdir'){
                    sortDir = value;
                }
                else {
                filters.push({"key":key,"value":value});
                }
            }
        }
    }
    
    if(sort != '' && sortDir != ''){
        filters.push({"key":'sort',"value":sort,"direction":sortDir});
    }
    
    return JSON.stringify(sources[source].searchMangaParse(page,response, query, filters)); //JSON.stringify(response)?
}

function chapterListRequest(source/*:String*/,seriesURL/*:String*/){ //-> String or JSON.stringify(JSONBrowserifyRequest)
    var request = sources[source].chapterListRequest(seriesURL);
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }
}

function chapterListParse(source/*:String*/, response/*:htmlString*/, seriesURL /*String*/){ //-> JSONSeries //seriesURL needed from request for mangasee
    //var $ = cheerio.load(response);
    return JSON.stringify(sources[source].chapterListParse(response,null/*$*/,seriesURL)); //JSON.stringify(response)?
}

function mangaDetailsRequest(source/*:String*/,seriesURL/*:String*/){ //-> String or JSON.stringify(JSONBrowserifyRequest)
    var request = sources[source].mangaDetailsRequest(seriesURL);
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }
}

function mangaDetailsParse(source/*:String*/, response/*:htmlString*/, seriesURL /*String*/){ //-> JSONSeries
    //var $ = cheerio.load(response);
    return JSON.stringify(sources[source].mangaDetailsParse(response,null/*$*/,seriesURL)); //JSON.stringify(response)?
}

function chapterListAndMangaDetailsRequest(source/*:String*/,seriesURL/*:String*/){ //-> String or JSON.stringify(JSONBrowserifyRequest)
    var request = sources[source].chapterListAndMangaDetailsRequest(seriesURL);
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }
}

//for now just use this one
function chapterListAndMangaDetailsParse(source/*:String*/, response/*:htmlString*/, seriesURL/*, invisible jsonChainedResponse.responseData ONLY*/){ //-> JSONSeries
    //var $ = cheerio.load(response);
    if(arguments.length == 4){
        //console.log("plp4 -- ", JSON.stringify(sources[source].pageListParse(response,chapter,arguments[3])));
        return JSON.stringify(sources[source].chapterListAndMangaDetailsParse(response,null/*$*/,seriesURL,arguments[3])); //JSON.stringify(response)?
    }
    else {
        //console.log("plp3 -- ", JSON.stringify(sources[source].pageListParse(response,chapter)));
        return JSON.stringify(sources[source].chapterListAndMangaDetailsParse(response,null/*$*/,seriesURL)); //JSON.stringify(response)?
    }
}


function getSourceInfo(source/*:String*/){ //-> JSONSourceInfo
    return JSON.stringify(sources[source].fetchSourceInfo()); //JSON.stringify(response)? //SYNCHRONOUS AS ALL BROWSERIFY FUNC SHOULD BE
}

//used by login
function loginRequest(source/*:String*/,username/*:String*/,password/*:String*/){ //-> String or JSON.stringify(JSONBrowserifyRequest)
    var request = sources[source].loginRequest(username,password);
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }
}

function loginParse(source/*:String*/,response/*:response*/){ //-> JSONSeries
    //var $ = cheerio.load(response);
    return JSON.stringify(sources[source].loginParse(response)); //JSON.stringify(response)?
}

function setCookie(source/*:String*/,cookie/*String*/){ //-> string response statusCode
    sources[source].cookie = cookie; //set cookie to source, TODO either make every source have this property, or this will crash if called for sources without cookies
    return '200';
}

function setCFHeaders(source/*:String*/, headers /*[String:String]*/){ //-> response statusCode // should just be {string:string} object
    sources[source].cfheaders = headers; //set cfheaders to source, TODO either make every source have this property, or this will crash if called for sources without cookies
    return '200';
}

function pageListRequest(source/*:String*/,chapterURL/*:String*/,chapterNumber/*:String*/,seriesURL/*:String*/){ //-> String or JSON.stringify(JSONBrowserifyRequest)
    
    var chapter = {
        series: seriesURL,
        chapter: chapterURL,
        number: chapterNumber
    };
    
    //var request = sources[source].pageListRequest(chapterURL,chapterNumber,seriesURL);
    var request = sources[source].pageListRequest(chapter); //pageList
    
    
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }
}

function pageListParse(source/*:String*/,response/*:response*/,chapterURL/*:String*/,chapterNumber/*:String*/,seriesURL/*:String*//*, invisible jsonChainedResponse.responseData ONLY*/){ //-> [JSONPage]
    //necessary for deninemanga
    var chapter = {
        series: seriesURL,
        chapter: chapterURL,
        number: chapterNumber
    };
    
    console.log("pageListParse main arguments -- ", arguments);
    
    if(arguments.length == 6){
        console.log("plp6 -- ", JSON.stringify(sources[source].pageListParse(response,chapter,arguments[5])));
        return JSON.stringify(sources[source].pageListParse(response,chapter,arguments[5])); //JSON.stringify(response)?
    }
    else {
        console.log("plp5 -- ", JSON.stringify(sources[source].pageListParse(response,chapter)));
        return JSON.stringify(sources[source].pageListParse(response,chapter)); //JSON.stringify(response)?
    }
}

//for use by browserify
function getAvailableSources(){
    var sources = [];
    sources.push({"name":"deninemanga","version":1.0,"defaultUnlocked":true,"unlockKey":null});
    return JSON.stringify(sources);
}

//MARK: for Trackers

function setTrackerClient(source/*:String*/,client/*String*/){ //-> string response statusCode
    sources[source].client = client; //set client to source, TODO either make every source have this property, or this will crash if called for sources without client
    return '200';
}

//match for app.post('/trackerauth/:source', (req, res) => { -- based on setCFHeaders
function setTrackerAuth(source/*:String*/, authinfo /*[String:String]*/){ //-> response statusCode // should just be {string:string} object
    sources[source].authinfo = authinfo; //set authinfo to tracker source, TODO either make every source have this property, or this will crash if called for sources without authinfo
    return '200';
}

//match for app.post('/trackeraddtolist/:source', (req, res) => {
function trackerAddToListRequest(source/*source*/, manga /*[String:String]*/){ //-> String or JSON.stringify(JSONBrowserifyRequest)
    var request = sources[source].addToListRequest(manga);
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }
}
function trackerAddToListParse(source/*:String*/,response/*:response*/){ //-> statusCode?//JSONTrackerListManga
    return JSON.stringify(sources[source].addToListParse(response));
}

//match for app.get('/trackerinfo/:source', (req,res) => { //get tracker options for a tracker source
function getTrackerInfo(source/*:String*/){ //-> JSONTrackerInfo
    return JSON.stringify(sources[source].fetchTrackerInfo()); //JSON.stringify(response)? //SYNCHRONOUS AS ALL BROWSERIFY FUNC SHOULD BE
}

//match for app.get('/trackermanga/:source/', (req,res) => { //?mangaurl=${mangaURL}&id=${extraInfo/id/whatever/is/needed}
function getMangaFromListRequest(source/*:String*/,mangaURL/*:String*/,id/*:String?*/){ //-> String or JSON.stringify(JSONBrowserifyRequest)
    
    var request = sources[source].getMangaFromListRequest(mangaURL,id);
    
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }
}

function getMangaFromListParse(source/*:String*/,response/*:response*/,mangaURL/*:String*/,id/*:String?*/){ //-> JSONTrackerListManga?
    return JSON.stringify(sources[source].getMangaFromListParse(response,mangaURL,id)); //JSON.stringify(response)?
}


//match for app.get('/trackeruserlist/:source/:page', async (req,res) => {
function userListMangaRequest(source/*:String*/,page/*:Int*/){// -> String or JSON.stringify(JSONBrowserifyRequest)
    var request = sources[source].userListMangaRequest(page);
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }
}
function userListMangaParse(source/*:String*/,page/*:Int*/, response/*:htmlString*/){// -> JSONMangasPage
    return JSON.stringify(sources[source].userListMangaParse(page,response));
}

//used by anilist to get current authenticated username (needed to call userListMangaRequest)
function currentUserRequest(source/*:String*/){ //-> String or JSON.stringify(JSONBrowserifyRequest)
    var request = sources[source].currentUserRequest();
    if (typeof request === 'string' || request instanceof String){
        //just a string url
        return request; //JSON.stringify(response)?
    }
    else {
        //object request
        return JSON.stringify(request);
    }
}

function currentUserParse(source/*:String*/,response/*:response*/){ //-> JSONSeries
    var currentUserName = sources[source].currentUserParse(response); //this should be a string
    
    if (typeof currentUserName === 'string' || currentUserName instanceof String){
        //just a string currentUserName
        return currentUserName;
    }
    else {
        //object currentUserName
        return JSON.stringify(currentUserName);
    }
}

function setTrackerUser(source/*:String*/,username/*String*/){ //-> string response statusCode
    sources[source].username = username; //set username to source, TODO either make every source have this property, or this will crash if called for sources without username
    return '200';
}
//MARK: end for Trackers


module.exports = {popularMangaRequest: popularMangaRequest, popularMangaParse: popularMangaParse, latestUpdatesRequest: latestUpdatesRequest, latestUpdatesParse: latestUpdatesParse, searchMangaRequest: searchMangaRequest, searchMangaParse: searchMangaParse, chapterListRequest: chapterListRequest, chapterListParse: chapterListParse, mangaDetailsRequest: mangaDetailsRequest, mangaDetailsParse: mangaDetailsParse, chapterListAndMangaDetailsRequest: chapterListAndMangaDetailsRequest, chapterListAndMangaDetailsParse: chapterListAndMangaDetailsParse, getSourceInfo: getSourceInfo, loginRequest: loginRequest, loginParse: loginParse, setCookie: setCookie, setCFHeaders: setCFHeaders, pageListRequest: pageListRequest, pageListParse: pageListParse, getAvailableSources: getAvailableSources, setTrackerClient:setTrackerClient, setTrackerAuth: setTrackerAuth, trackerAddToListRequest:trackerAddToListRequest, trackerAddToListParse:trackerAddToListParse, getTrackerInfo:getTrackerInfo,getMangaFromListRequest:getMangaFromListRequest,getMangaFromListParse:getMangaFromListParse,userListMangaRequest:userListMangaRequest,userListMangaParse:userListMangaParse,currentUserRequest:currentUserRequest,currentUserParse:currentUserParse,setTrackerUser:setTrackerUser};