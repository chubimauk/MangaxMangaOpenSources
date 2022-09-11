'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');

//var cloudscraper = require('cloudscraper'); //for image download to bypass cloudflare -- CRASHES ON REAL DEVICE
//const CloudflareBypasser = require('cloudflare-bypasser'); //for image download to bypass cloudflare

module.exports = class Mangasee extends Source  {

    constructor() {
        super(); //super must be called first otherwise variables are "used before declaration"
        //The manga provider to download the pages from
        this.baseUrl = 'https://mangasee123.com';
    }
    
    //all results are loaded on the first page, so only need ONE request (page 1, there is never a page 2)
    
    //mangasee
    latestUpdatesRequest(page /*Int*/) {
        return this.popularMangaRequest("1");
    }
    
    //mangasee
    latestUpdatesParse(page /*Int*/, response /*String -- latestUpdatesResponse -- currentPageHtml */){
        //all results are loaded on first page
        let directory = this.directoryFromResponse(response);
        
        //sort ascending by lt property
        /*directory = directory.sort(function(a, b){
          return a['lt'] == b['lt'] ? 0 : +(a['lt'] > b['lt']) || -1;
        });*/
        
        //sort descending by lt property
        directory = directory.sort(function(a, b){
          return a['lt'] == b['lt'] ? 0 : +(a['lt'] < b['lt']) || -1;
        });
        
        var json = this.parseDirectory(directory); //list of mangas
        
        json.forEach(function(element){
                          element.updates = 1;
        });
        
        return this.mangasPage(json, false, 2, json.length);
    }
    
    
    //mangasee
    popularMangaRequest(page /*Int*/) {
        var url = this.baseUrl + `/search`;
        return this.getRequestWithHeaders(url);
    }
    
    //mangasee -- override source.js
    popularMangaParse(page /*Int*/, response /*String -- popularMangaResponse - currentPageHtml */){
        let directory = this.directoryFromResponse(response);
        
        //sort ascending by v property
        /*directory = directory.sort(function(a, b){
          return a['v'] == b['v'] ? 0 : +(a['v'] > b['v']) || -1;
        });*/
        
        //sort descending by v property
        directory = directory.sort(function(a, b){
          return a['v'] == b['v'] ? 0 : +(a['v'] < b['v']) || -1;
        });

        var json = this.parseDirectory(directory); //list of mangas
        
        return this.mangasPage(json, false, 2, json.length);
    }
    
    //mangasee
    directoryFromResponse(response /*String*/) {
        let directory = JSON.parse((response.match(/vm.Directory = (.*);/) || [])[1]);
        return directory;
    }
    
    //mangasee
    parseDirectory(directory){
        
        var mangas = [];
        
        var thisReference = this;
        directory.forEach(function(element){
                          var title = `${element['s']}`;
                          var url = `/manga/${element["i"]}`;
                          //var thumbnail = `https://cover.mangabeast01.com/cover/${element["i"]}.jpg`; //old no longer correct
                            var thumbnail = `https://cover.nep.li/cover/${element["i"]}.jpg`;
                          var rank = `${element['v']}`;
                          mangas.push(thisReference.manga(title,url,thumbnail,rank));
                          //this.mangaDetails(title, thumbnail, description, authors.join(), artists.join(), status, genres);
        });
        return mangas;
    }
    
    //mangasee -- used for chapter url
    chapterURLEncode(indexChapter /*String*/) {
        var e = indexChapter;
        var index = '';
        var t = parseInt(e.substring(0,1)) || 0;
        if (1 != t) {
           index = `-index-${t}`;
        }
        var n = e.substring(1, e.length - 1);
        var suffix = '';
        var path = parseInt(e.substring(e.length - 1, e.length)) || 0;
        if (0 != path) {
            suffix = `.${path}`;
        }
        return `-chapter-${n}${suffix}${index}.html`;
    }
    
    //mangasee -- used for pages
    chapterImage(indexChapter, cleanString){
        //get chapter number from garbage string like this "100830" which is really chapter 83
        var e = indexChapter;
        var a = e.substring(1,e.length - 1);
        
        if (cleanString) {
            var regex = /["""^0+"""]+/g; //regex is the part between []
            a = a.replace(regex,"");
        }
        
        var b = parseInt(e.substring(e.length - 1, e.length)) || 0;
        
        
        
        if (b == 0) {
            return a;
        }
        else {
            return `${a}.${b}`;
        }
        
    }
    
    //mangasee -- used for chapter number
    chapterNumber(indexChapter, cleanString){
        /*//get chapter number from garbage string like this "100830" which is really chapter 83
        var e = indexChapter;
        var a = e.substring(1,e.length - 1);
        
        if (cleanString) {
            var regex = /["""^0+"""]+/g; //regex is the part between []
            a = a.replace(regex,"");
        }
        
        var b = parseInt(e.substring(e.length - 1, e.length)) || 0;
        
        
        
        if (b == 0) {
            return a;
        }
        else {
            return `${a}.${b}`;
        }*/
        
        //^^above gives the same result for 1 and 10 (for example), bottom based on chapterURLEncode works better
        var e = indexChapter;
        var t = parseInt(e.substring(0,1)) || 0;
        
        var n = e.substring(1, e.length - 1);
        var suffix = '';
        var path = parseInt(e.substring(e.length - 1, e.length)) || 0;
        console.log("path -- ", path);
        if (0 != path) {
            suffix = `.${path}`;
        }
        var chapterWithLeadingZeroes = `${n}${suffix}`;
        
        var chapterNumber = chapterWithLeadingZeroes.replace(/^0+/, '');
        if (chapterNumber == ""){
            chapterNumber = "0";
        }
        return chapterNumber;
    }
    
    //mangasee
     chapterListParse(response, $, seriesURL){ //list of chapter
         console.log("mangasee - started chapterListParse");
         
         let chaptersJSON = JSON.parse((response.match(/vm.Chapters = (.*);/) || [])[1]);
         
         var chapters = [];
         //chapter(url, language, volume, number, title, date_upload, scanlator){
         var thisReference = this;
         chaptersJSON.forEach(function(element){
             
             var indexChapter = element['Chapter'];
             var number = `${thisReference.chapterNumber(indexChapter, true)}`;
             var title = element['ChapterName'] || `${element['Type']} ${number}`; //type seems to always just be Chapter though
             var url = '/read-online/' + thisReference.substringAfterFirst('/manga/', seriesURL) + thisReference.chapterURLEncode(indexChapter);
             var date_upload = element['Date'] || '0';
             
             chapters.push(thisReference.chapter(url, "English", null /*volume*/, number, title, date_upload, null /*scanlator*/));
             //date_upload = try {
             //                    json["Date"].nullString?.let { dateFormat.parse("$it +0600")?.time } ?: 0
             //                } catch (_: Exception) {
             //                    0L
             //                }
         });
         console.log("# chapters -- ", chapters.length);
         return chapters;
    }
    
    //mangasee
    mangaDetailsParse(response, $, seriesURL){ //mangaDetails object
        console.log("mangasee - mangaDetailsParse started");
        if($ == null){
            //var $ = cheerio.load(response);
            $ = cheerio.load(response);
        }
        console.log("mangasee - mangaDetailsParse loaded into cheerio");
        
        var info = $('div.BoxBody > div.row');
        
        var title = info.find('h1').text();
        var author = info.find('li.list-group-item:has(span:contains(Author)) a').first().text();
        var genres = [];
        
        info.find("li.list-group-item:has(span:contains(Genre)) a").each(function (index, ge) {
            genres.push($(ge).text());
          });
        
        var status = info.find("li.list-group-item:has(span:contains(Status)) a:contains(Publish)").text();//.toStatus();
        status = status.replace(' (Publish)',"").toUpperCase();
        var description = info.find("div.Content").text();
        var thumbnail = info.find("img").attr("src");
        
        return this.mangaDetails(title, thumbnail, description, author, null, status, genres);
    }
    
    //mangasee
    pageListParse(pageListResponse){
        var pages = [];
        var curPathName = JSON.parse((pageListResponse.match(/vm.CurPathName = (.*);/) || [])[1]); //CurPathName changed to goodmorninganotherdayanotherfight to CurPathNamez
        var curChapter = JSON.parse((pageListResponse.match(/vm.CurChapter = (.*);/) || [])[1]);
        var titleURI = JSON.parse((pageListResponse.match(/vm.IndexName = (.*);/) || [])[1]);
        var pageTotal = parseInt(curChapter['Page'] || 0);
        
        var host = 'https://' + curPathName;
        var seasonURI = curChapter['Directory'];
        if(seasonURI){
            seasonURI = seasonURI + '/';
        }
        else {
            seasonURI = '';
        }
        
        var path = `${host}/manga/${titleURI}/${seasonURI}`;
        var chNum = this.chapterImage(curChapter["Chapter"]);
        
        var headers = {};
        headers['Referer'] = `${this.baseUrl}/`;
        for (let i = 0; i < pageTotal; i++) {
            let s = '000' + (i + 1)
            let imageNum = s.substr(s.length - 3);
            var url = `${path}${chNum}-${imageNum}.png`;
            //jsonBrowserifyRequest(url,uri,method,headers /*[String:String]?*/,form /*[String:Any]?*/){
            pages.push(super.jsonBrowserifyRequest(url,null,null,headers,null));
            //pages.push(super.jsonBrowserifyRequest(url,null,null,null,null));
        }
        //console.log("mangasee pages -- ", pages);
        return pages;
    }
    
    fetchSourceInfo() {
        var sourceInfo = {};
        sourceInfo.requiresLogin = false; //will show login to get cookies based on this in app
        sourceInfo.url = this.baseUrl;
        sourceInfo.isCloudFlareSite = false;
        
        var filters = [];
        
        //mangapark
        /*var seriesNameFilter = {}; //this is used for query, so no need to show it here too
        seriesNameFilter.paramKey = 'name';
        seriesNameFilter.displayName = 'Series Name';
        seriesNameFilter.type = 'text';*/
        
        var authorFilter = {}; //TODO -- CONTAIN/BEGIN/END options? -- just going to use contains, same for title (query)
        authorFilter.paramKey = 'author';
        authorFilter.displayName = 'Author';
        authorFilter.type = 'text';
        
        var yearFilter = {}; //TODO -- CONTAIN/BEGIN/END options? -- just going to use contains, same for title (query)
        yearFilter.paramKey = 'year';
        yearFilter.displayName = 'Year';
        yearFilter.type = 'text';
        
        var officialTranslationFilter = {};
        officialTranslationFilter.paramKey = 'official';
        officialTranslationFilter.displayName = 'Official Translation';
        officialTranslationFilter.type = 'choice';
        officialTranslationFilter.options = { 'no':'Any','yes':'Official Translation Only'};
        
        var scanStatusFilter = {};
        scanStatusFilter.paramKey = 'status';
        scanStatusFilter.displayName = 'Scan Status';
        scanStatusFilter.type = 'choice';
        scanStatusFilter.options = this.getScanStatusFilterOptionsList();
        
        var publishStatusFilter = {};
        publishStatusFilter.paramKey = 'pstatus';
        publishStatusFilter.displayName = 'Publish Status';
        publishStatusFilter.type = 'choice';
        publishStatusFilter.options = this.getPublishStatusFilterOptionsList();
        
        var typeFilter = {};
        typeFilter.paramKey = 'type';
        typeFilter.displayName = 'Type';
        typeFilter.type = 'choice';
        typeFilter.options = this.getTypeFilterOptionsList();
        
        //mangasee
        var genreFilter = {};
        genreFilter.paramKey = 'genres';
        genreFilter.displayName = 'Genres';
        genreFilter.type = 'tag';
        genreFilter.options = this.getGenresList();
        
        var sortFilter = {};
        sortFilter.paramKey = 'sort';
        sortFilter.displayName = 'Sort';
        sortFilter.type = 'sort';
        sortFilter.options = {};
        sortFilter.options['s'] = 'Alphabetical';
        sortFilter.options['lt'] = 'Recently Released Chapter';
        sortFilter.options['y'] = 'Year Released';
        sortFilter.options['v'] = 'Most Popular (All Time)';
        sortFilter.options['vm'] = 'Most Popular (Monthly)';
        
        //filters.push(seriesNameFilter); //used as query
        filters.push(authorFilter);
        filters.push(sortFilter);
        filters.push(typeFilter);
        filters.push(genreFilter);
        filters.push(yearFilter);
        filters.push(officialTranslationFilter);
        filters.push(scanStatusFilter);
        filters.push(publishStatusFilter);
        
        sourceInfo.filters = filters;
        
        sourceInfo.displayInfo = []; //[JSONSourceDisplayInfoTag]?
        
        //jsonSourceDisplayInfoTag(type /*String - one of "bug", "content", "language", "contributor", "tracker", "note",*/, values /*[String]*/, hexColors /*HEX COLOR CODES [String]?*/)
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language",["English"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content",["Manga"],["#4D83C1"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor",["mangaxmanga"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("note",["High Quality Scans"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker",["No"],[])); //should just be No or Yes
        
        console.log("mangasee sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page /*Int*/, query, filters) {
        //this isn't even necessary because every page has everything, we're just going to filter this shit ourselves in searchMangaParse...
        console.log("mangasee filters -- ", filters);
        var query = query = query.replace("_","%20"); //spaces need to be %20 for mangasee
        var url = this.baseUrl + '/search/';
        
        var isFirstParameter = true;
        
        if (!super.isEmpty(query)){
            url = super.addQueryParameter(url, "name", query, isFirstParameter); //search query
            isFirstParameter = false;
        }
        
        for(var i=0; i<filters.length; i++){
            switch(filters[i].key) {
              case "official":
                    //officalTranslationFilter.paramKey = 'official';
                    if(filters[i].key != 'Any'){
                        url = super.addQueryParameter(url, filters[i].key, filters[i].value, isFirstParameter);
                        isFirstParameter = false;
                    }
                    break;
              case 'genres':
                    //genreFilter.paramKey = 'genres';
                    url = super.addQueryParameter(url, filters[i].key, filters[i].value, isFirstParameter);
                    isFirstParameter = false;
                    break;
              case 'status':
                    //scanStatusFilter.paramKey = 'status';
                    if(filters[i].key != 'Any'){
                        url = super.addQueryParameter(url, filters[i].key, filters[i].value, isFirstParameter);
                        isFirstParameter = false;
                    }
                    break;
              case 'pstatus':
                    //publishStatusFilter.paramKey = 'pstatus';
                    if(filters[i].key != 'Any'){
                        url = super.addQueryParameter(url, filters[i].key, filters[i].value, isFirstParameter);
                        isFirstParameter = false;
                    }
                    break;
              case 'type':
                    //publishStatusFilter.paramKey = 'pstatus';
                    if(filters[i].key != 'Any'){
                        url = super.addQueryParameter(url, filters[i].key, filters[i].value, isFirstParameter);
                        isFirstParameter = false;
                    }
                    break;
              case 'sort':
                    //sortFilter.paramKey = 'sort';
                    url = super.addQueryParameter(url, filters[i].key, filters[i].value, isFirstParameter);
                    isFirstParameter = false;
                    
                    if(filters[i].direction == "asc"){
                        url += '&desc=false';
                    }
                    else if(filters[i].direction == "desc"){
                        url += '&desc=true';
                    }
                    
                    break;
              case 'author':
                    //chapterCountFilter.paramKey = 'chapters';
                    url = super.addQueryParameter(url, filters[i].key, filters[i].value.replace("_","%20"), isFirstParameter); //spaces always passed as _, should be %20 for mangasee
                    isFirstParameter = false;
                    break;
              case 'year':
                    //statusFilter.paramKey = 'status';
                    url = super.addQueryParameter(url, filters[i].key, filters[i].value.replace("_","%20"), isFirstParameter); //spaces always passed as _, should be %20 for mangasee
                    isFirstParameter = false;
                    break;
            }
        }
        
        //return url;
        return this.getRequestWithHeaders(url);
    }
    
    searchMangaParse(page /*Int*/, response /*String -- searchMangaResponse -- searchPageHtml */, query, filters){ //query, filters from request needed for mangasee
        //there is only one page for mangasee
        
        var query = query = query.replace("_"," "); //spaces need to be + for mangapark
        
        let directory = this.directoryFromResponse(response);
        
        
        directory = directory.filter(function (it) {
            return it['s'].toLowerCase().includes(query.toLowerCase());
        });
        
        for(var i=0; i<filters.length; i++){
            switch(filters[i].key) {
                case 'sort':
                    var sortBy = filters[i].value;
                    if (filters[i].direction == 'asc'){
                        //sort ascending
                        directory = directory.sort(function(a, b){
                          return a[sortBy] == b[sortBy] ? 0 : +(a[sortBy] > b[sortBy]) || -1;
                        });
                    }
                    else {
                        //sort descending
                        directory = directory.sort(function(a, b){
                          return a[sortBy] == b[sortBy] ? 0 : +(a[sortBy] < b[sortBy]) || -1;
                        });
                    }
                      break;
              case "official":
                    //officalTranslationFilter.paramKey = 'official';
                    if(filters[i].key != 'Any'){
                        directory = directory.filter(function (it) {
                            return it['o'].includes('yes'); //TODO -- ignoreCase?
                        });
                    }
                    break;
              case 'genres':
                    //genreFilter.paramKey = 'genres';
                    var filterGenres = filters[i].value.split(',');
                    directory = directory.filter(function (it) {
                        return it['g'].some(g=> filterGenres.includes(g)); //TODO -- ignoreCase!! //array
                        //return it['g'].includes(filters[i].value);
                    });
                    break;
              case 'status':
                    //scanStatusFilter.paramKey = 'status';
                    if(filters[i].key != 'Any'){
                        directory = directory.filter(function (it) {
                            return it['ss'].includes(filters[i].value); //TODO -- ignoreCase!!
                        });
                    }
                    break;
              case 'pstatus':
                    //publishStatusFilter.paramKey = 'pstatus';
                    if(filters[i].key != 'Any'){
                        directory = directory.filter(function (it) {
                            return it['ps'].includes(filters[i].value); //TODO -- ignoreCase!!
                        });
                    }
                    break;
              case 'type':
                    //publishStatusFilter.paramKey = 'pstatus';
                    if(filters[i].key != 'Any'){
                        directory = directory.filter(function (it) {
                            return it['t'].includes(filters[i].value); //TODO -- ignoreCase!!
                        });
                    }
                    break;
              
              case 'author':
                    //chapterCountFilter.paramKey = 'chapters';
                    directory = directory.filter(function (it) {
                        var lowercasedAuthors = it['a'].map(a => a.toLowerCase());
                        for(var index = 0; index<lowercasedAuthors.length; index++){
                            if(lowercasedAuthors[index].includes(filters[i].value.toLowerCase())){ //checking if any string in the array contains a substring that is our search author
                                return true;
                            }
                        }
                        return false;
                    });
                    break;
              case 'year':
                    //statusFilter.paramKey = 'status';
                    directory = directory.filter(function (it) {
                        return it['y'].includes(filters[i].value); //TODO -- ignoreCase!!
                    });
                    break;
            }
        }
            
        var json = this.parseDirectory(directory); //list of mangas
        
        return this.mangasPage(json, false, 2, json.length);
    }
    
    //mangasee
    getGenresList(){ //value is display string
        return {
        'Action':'Action',
        'Adult':'Adult',
        'Adventure':'Adventure',
        'Comedy':'Comedy',
        'Doujinshi':'Doujinshi',
        'Drama':'Drama',
        'Ecchi':'Ecchi',
        'Fantasy':'Fantasy',
        'Gender%20Bender':'Gender Bender',
        'Harem':'Harem',
        'Hentai':'Hentai',
        'Historical':'Historical',
        'Horror':'Horror',
        'Josei':'Josei',
        'Lolicon':'Lolicon',
        'Martial%20Arts':'Martial Arts',
        'Mature':'Mature',
        'Mecha':'Mecha',
        'Mystery':'Mystery',
        'Psychological':'Psychological',
        'Romance':'Romance',
        'School%20Life':'School Life',
        'Sci-fi':'Sci-fi',
        'Seinen':'Seinen',
        'Shotacon':'Shotacon',
        'Shoujo':'Shoujo',
        'Shoujo %20Ai':'Shoujo Ai',
        'Shounen':'Shounen',
        'Shounen%20Ai':'Shounen Ai',
        'Slice%20of%20Life':'Slice of Life',
        'Smut':'Smut',
        'Sports':'Sports',
        'Supernatural':'Supernatural',
        'Tragedy':'Tragedy',
        'Yaoi':'Yaoi',
        'Yuri':'Yuri'
        };
    }
    
    getScanStatusFilterOptionsList(){ //value is display string
        return {
        'Any':'Any',
        'Cancelled':'Cancelled',
        'Complete':'Complete',
        'Discontinued':'Discontinued',
        'Hiatus':'Hiatus',
        'Ongoing':'Ongoing'
        };
    }
    
    getPublishStatusFilterOptionsList(){ //value is display string
        return {
        'Any':'Any',
        'Cancelled':'Cancelled',
        'Complete':'Complete',
        'Discontinued':'Discontinued',
        'Hiatus':'Hiatus',
        'Ongoing':'Ongoing'
        };
    }
    
    getTypeFilterOptionsList(){ //value is display string
        return {
        'Any':'Any',
        'Doujinshi':'Doujinshi',
        'Manga':'Manga',
        'Manhua':'Manhua',
        'Manhwa':'Manhwa',
        'OEL':'OEL',
        'One-shot':'One-shot'
        };
    }
    
    //mangasee - these are overriding source.js base implementation in order to add headers
    chapterListRequest(seriesURL) {
        var url = this.baseUrl + seriesURL; //headers?
        return this.getRequestWithHeaders(url);
    }
    //mangasee - these are overriding source.js base implementation in order to add headers
    mangaDetailsRequest(seriesURL) {
        var url = this.baseUrl + seriesURL; //headers?
        return this.getRequestWithHeaders(url);
    }
    //mangasee - these are overriding source.js base implementation in order to add headers
    pageListRequest(chapter) {
        console.log("pageListRequest", this.baseUrl + chapter.chapter);
        var url =  this.baseUrl + chapter.chapter; //headers ?
        return this.getRequestWithHeaders(url);
    }
    
    //updated for mangasee
    getRequestWithHeaders(url/*:String*/) {
        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/77.0';
        const options = {
                   url: url,
               headers: {
                   'User-Agent': userAgent,
               }
               };
        return options;
    }
    
    //ENDPOINT 2- GET ALL
     //MANGAPARK GET ALL
     //this uses promises to do everything in parallel -> 7 seconds to get all results
    async getAll() {
        return await this.fetchPopularManga('1'); //everything is loaded in the first page =P
    }
}

