'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');


//MadaraEXT is part of MangaBox
module.exports = class Isekaiscan/*MadaraEXT*/ extends Source  {

    constructor() {
        super(); //super must be called first otherwise variables are "used before declaration"
        //The manga provider to download the pages from
        this.baseUrl = 'https://isekaiscan.com';
        
    }
    getRequestWithHeaders(url/*:String*/) {
        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0';
        var hosts = this.baseUrl.replace(/^(https?:|)\/\//, '')
               var options = {
                'method': 'POST',
                'url': url,
                'headers': {
                  'Host': hosts,
                  'User-Agent': userAgent,
                  'Referer': this.baseUrl,
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', //"text/html, */*; q=0.01"
                  'Accept-Language': 'en-us',
                  'Connection': 'keep-alive',
                  'X-Requested-With': 'XMLHttpRequest'
                },
                agentOptions: {
                    ciphers: 'AES256-SHA'
                  }
              };
        return options;
    }
    searchMangaSelector() {
        return 'div.c-tabs-item__content';
    }
    
    searchMangaFromElement(element /*cheerio element --> $(this)*/) {
        return this.mangaFromElement(element);
    }
    
    //unique to MadaraEXT
    mangaFromElement(element /*cheerio element --> $(this)*/){
        var coverElement = element.find('h3 a').first();
        var url = super.substringAfterFirst('.com', 'https:' + coverElement.attr('href'));
        var name = coverElement.text();
        var thumbnai = element.find('img').attr('data-src'); //urls include https: already
        var rank = '0'; //this must be a fucking string
        if (typeof thumbnai === undefined){
            thumbnai = element.find('img').attr('src');
        }
        var thumbnail =  thumbnai + '?'
        if(thumbnail.includes(".webp")){
            thumbnail = "http://103.252.91.150:8080/jpeg/" + thumbnail
        }
        return super.manga(name,url,thumbnail,rank);
    }
    
    latestUpdatesRequest(page /*Int*/) {
        return this.getRequestWithHeaders(this.baseUrl + `/page/` + page + `?s&post_type=wp-manga&m_orderby=latest`); //headers?
    }
    
    latestUpdatesSelector() {
        return this.popularMangaSelector();
    }
    
    latestUpdatesFromElement(element /*cheerio element --> $(this)*/) {
        return this.mangaFromElement(element)
    }
    popularMangaRequest(page /*Int*/) {
        return this.getRequestWithHeaders(this.baseUrl + `/page/${page}/?s&post_type=wp-manga&m_orderby=views`); //headers?
    }
    
    popularMangaSelector() {
        return 'div.c-tabs-item__content';
    }
    
    popularMangaFromElement(element /*cheerio element --> $(this)*/) {
        return this.mangaFromElement(element);
    }

    getLastPageNumber(firstPageHtml){ //for popular
        /*<div class="panel-page-number">
        <div class="group-page"><a href="https://MadaraEXT.com/genre-all" class="page-blue">FIRST(1)</a><a href="https://MadaraEXT.com/genre-all">1</a><a class="page-select">2</a><a href="https://MadaraEXT.com/genre-all/3">3</a><a href="https://MadaraEXT.com/genre-all/4">4</a><a href="https://MadaraEXT.com/genre-all/1110" class="page-blue page-last">LAST(1110)</a></div><div class="group-qty"><a class="page-blue">TOTAL : 26,640</a></div> </div>*/
        var $ = cheerio.load(firstPageHtml);
        var lastPageHREFText = $('.last').attr('href');
        if (lastPageHREFText === undefined) {
            return parseInt(1);
        } else {
            var lastNumbersOnly = lastPageHREFText.match(/\d/g);
            var lastNumber = 0;
            if (lastNumbersOnly != null && lastNumbersOnly.length > 0){ //protect against results with no paging, there won't be a next page if there is only 1 page
                lastNumber = lastNumbersOnly.join('');
            }
            return parseInt(lastNumber);
        }

    }
    
    getLastPageNumberForLatest(latestPageHtml){
        return this.getLastPageNumber(latestPageHtml);
    }
    
    getLastPageNumberForSearch(searchPageHtml){
        return this.getLastPageNumber(searchPageHtml);
    }
    
    chapterListSelector() {
        return "li.wp-manga-chapter";
    }
    
    
    
    //overriding source.js
    chapterListRequest(seriesURL) {
        if(seriesURL.startsWith('http')){
            return this.getRequestWithHeaders(seriesURL);
        }
        else {
            return this.getRequestWithHeaders(super.chapterListRequest(seriesURL));
        }
    }
    
    mangaDetailsRequest(seriesURL) {
        if(seriesURL.startsWith('http')){
            return this.getRequestWithHeaders(seriesURL);
        }
        else {
            return this.getRequestWithHeaders(super.mangaDetailsRequest(seriesURL));
        }
    }
    
    chapterFromElement(chapterElement, source){
        var $ = cheerio.load(chapterElement);
        
        var chapterAElement = $('a');
        var url = super.substringAfterFirst(this.baseUrl, chapterAElement.attr('href'));
        var nam = chapterAElement.text().trim();
        var name = nam.charAt(0).toUpperCase() + nam.slice(1);
        var scanlator = ""; //TODO for MadaraEXT
        var date_upload = $('span').last().text().trim();

        var volumeNumber = '';
        var chapterNumber = '';
        return super.chapter(url, "English", volumeNumber, chapterNumber, name, date_upload, scanlator);
    }
    
     chapterListParse(response, $, seriesURL /*not necessary for MadaraEXT but needs to match api*/){ //list of chapter
         console.log("started chapterListParse");
         if($ == null){
             //var $ = cheerio.load(response);
             $ = cheerio.load(response);
         }
         console.log("chapterListParse loaded into cheerio");
        var thisReference = this;
        var chapters = [];
         
         
         $(this.chapterListSelector()).each(function (i, chapterElement){
             var chapter = thisReference.chapterFromElement(chapterElement);
             chapters.push(chapter);
         });
         
         console.log("chapterListParse finished");
        return chapters;
    }
    
    
    mangaDetailsMainSelector(){
        return 'div.col-sm-12';
    }
    descriptionSelector(){
        return "div.description-summary div.summary__content";
    }
    thumbnailSelector(){
        return "div.summary_image img";
    }

    mangaDetailsParse(response, $, seriesURL /*not necessary for MadaraEXT but needs to match api*/){ //mangaDetails object
        console.log("started mangaDetailsParse");
        if($ == null){
            //var $ = cheerio.load(response);
            $ = cheerio.load(response);
        }
        console.log("mangaDetailsParse loaded into cheerio");
        let name = $('div.post-title h1').text().trim();
        let title = name.replace(/HOT\n/g,"")
        let thumbnai = $('div.summary_image img').attr('data-src');
        let table = $('div.summary_content');
        let author = $('div.author-content > a').text();
        let artist = $('div.artist-content > a').text();
        let status = $('div.post-status div.summary-content').text().toUpperCase().trim();

       // let genres = $('div.genres-content a').text();
        var genres = [];
        if (typeof thumbnai === undefined){
            thumbnai = $('div.summary_image img').attr('src');
        }
        var thumbnail =  thumbnai + '?'
        if(thumbnail.includes(".webp")){
            thumbnail = "http://103.252.91.150:8080/jpeg/" + thumbnail
        }
        $('div.genres-content a').each(function (i, chapterElement){
            var gen = $(chapterElement).text();
            genres.push(gen);
        });
        let description = $('div.description-summary div.summary__content').text().trim();
        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }
    
    pageListSelector() {
        return "div.page-break img";
    }
    
    pageListRequest(chapter) {
        if(chapter.chapter.startsWith('http')){
            return this.getRequestWithHeaders(chapter.chapter); //headers?
        }
        else {
            return this.getRequestWithHeaders(super.pageListRequest(chapter));
        }
    }
    
    
    //override super because we need the chapter
    async fetchPageList(chapter){
        var pageListResponse = await this.send_request(this.pageListRequest(chapter));
        return this.pageListParse(pageListResponse,chapter);
    }
    
    pageListParse(pageListResponse,chapter){
        var $ = cheerio.load(pageListResponse);
        var thisReference = this;
        var pages = [];
        $(this.pageListSelector()).each(function (i, pageElement){
             var url = $(pageElement).attr('data-src').trim();
             
             if(url.startsWith("https://convert_image_digi.mgicdn.com")){
                url = "https://images.weserv.nl/?url=" + thisReference.substringAfterFirst("//", url);
             }
             var headers = {};
            headers['Referer'] = thisReference.pageListRequest(chapter);
            headers['Content-Type'] = 'image/jpeg';
            //headers['encoding'] = 'null';
            pages.push(thisReference.jsonBrowserifyRequest(url,null,null,headers,null));
        });
        console.log('MadaraEXT pages', pages);
        return pages;
    }
    
    //shouldn't need this anymore..
    async fetchPageImage(page /*JSONBrowserifyRequest*/){
        //page is JSON so that it can be different for every source and pass whatever it needs to
        const options = {
          url: page.url,
          encoding: null,
          resolveWithFullResponse: false, //adding this makes it so that you get back "content-type":"image/jpeg and other stuff, not just the buffer data of the image, //sending false so response is just the image, otherwise I have no idea how to properly decode/encode/save the fucking buffer byte data in ios/swift to an actual image (just opens as a blank)
          headers : {
              'Referer': page['headers']['Referer']
          }
        };
        
        console.log("fetchPageImage options -", options);
        //cloudscraper instead of rp crashes only on real device..
        var image = await rp(options)
        .then(function (response) {
            //console.log('User has %d repos', repos.length);
              //console.log(buffer);
              //response.body = response.body.toString('base64');
              return response;
        })
        .catch(function (err) {
            // API call failed...
               return err;
        });
        
        return image;
    }

    
    async fetchLatestManga(page /*Int*/){
        console.log("fetchLatestManga -- MadaraEXT");
        var page = parseInt(page);
        
        var currentPageHtml = await this.send_request(this.latestUpdatesRequest(`${page}`));
        return this.latestUpdatesParse(page, currentPageHtml);
    }
    
    latestUpdatesParse(page /*Int*/, response /*String -- latestUpdatesResponse -- currentPageHtml */){
        //return this.mangasPage([/*manga*/], /*hasNexPage*/ false, /*nextPage*/ 1, /*# results*/ 0);
        var page = parseInt(page); //protect WKNodeBrowserify
        var latestUpdatesSelector = this.latestUpdatesSelector();
        var $ = cheerio.load(response);
        
        //doesn't retrieve # of updates
        var json = [];
        $(latestUpdatesSelector).each(function (i, elem) {
            var mangaUpdate = new MadaraEXT().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1; //always 1 update for MadaraEXT, so can just use default implementation and add this
            json.push(mangaUpdate);
        });
        
        console.log("MadaraEXT latest -- ", json);
        
        var mangasPage = {};
        mangasPage.mangas = json;
        
        
        var lastPageNumber = this.getLastPageNumberForLatest(response); //this should work on every page for this source
        var hasNextPage = lastPageNumber > page;
        var nextPage = page + 1; //this doesn't matter if hasNextPage is false
        
        var results = json.length;
        if (lastPageNumber != null && lastPageNumber > 0){
            results = results * lastPageNumber;
        }
        
        return super.mangasPage(json, hasNextPage, nextPage, results);
    }
    
    fetchSourceInfo() {
        var sourceInfo = {};
        sourceInfo.requiresLogin = false; //will show login to get cookies based on this in app
        sourceInfo.url = this.baseUrl;
        sourceInfo.isCloudFlareSite = true;
        
        var filters = [];
        
        var incAndExcGenreFilter = {};
        incAndExcGenreFilter.paramKey = 'genres';
        incAndExcGenreFilter.includeKey = 'g_i';
        incAndExcGenreFilter.excludeKey = 'g_e';
        incAndExcGenreFilter.displayName = 'Genres Include/Exclude';
        incAndExcGenreFilter.type = 'doubletag'; //inlcude, exclude, unselected states
        incAndExcGenreFilter.options = this.getGenresList();
        
        var sortFilter = {};
        sortFilter.paramKey = 'sort';
        sortFilter.displayName = 'Sort';
        sortFilter.type = 'sort';
        sortFilter.options = {};
        sortFilter.options['latest'] = 'Latest updates';
        sortFilter.options['topview'] = 'Top View';
        sortFilter.options['newest'] = 'New manga';
        sortFilter.options['az'] = 'A-Z';
        
        var statusFilter = {};
        statusFilter.paramKey = 'status';
        statusFilter.displayName = 'Status';
        statusFilter.type = 'choice'; //drop-down single choice
        statusFilter.options = {};
        statusFilter.options['all'] = 'Ongoing and Complete'; //all is irrelevant, end search request doesn't need anything in this scenario
        statusFilter.options['completed'] = 'Completed';
        statusFilter.options['ongoing'] = 'Ongoing';
        
        var keywordFilter = {};
        keywordFilter.paramKey = 'keyword';
        keywordFilter.displayName = 'Search keyword in';
        keywordFilter.type = 'choice'; //drop-down single choice
        keywordFilter.options = {};
        keywordFilter.options['e'] = 'Everything'; //e is irrelevant, end search request doesn't need anything in this scenario
        keywordFilter.options['title'] = 'Title';
        keywordFilter.options['alternative'] = 'Alternative Name';
        keywordFilter.options['author'] = 'Author';
        
        filters.push(incAndExcGenreFilter);
        filters.push(sortFilter);
        filters.push(statusFilter);
        filters.push(keywordFilter);
        
        sourceInfo.filters = filters;
        
        sourceInfo.displayInfo = []; //[JSONSourceDisplayInfoTag]?
        
        //jsonSourceDisplayInfoTag(type /*String - one of "bug", "content", "language", "contributor", "tracker", "note",*/, values /*[String]*/, hexColors /*HEX COLOR CODES [String]?*/)
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language",["English"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content",["Manga"],["#4D83C1"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor",["xOnlyFadi"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker",["No"],[])); //should just be No or Yes
        
        console.log("isekaiscan sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page /*Int*/, query, filters) {
        console.log("MadaraEXT filters -- ", filters);
        var query = query = query.replace(/_/g,"+"); //spaces need to be _ for MadaraEXT
        if (Object.keys(filters).length === 0) {
            //check dictionary/object is empty
            console.log("filters are empty");
            //addQueryParameter(url, name, value, isFirstParameter)
            //var url = this.baseUrl + `/page/${page}?s=` + this.normalizeSearchQuery(query) + `&post_type=wp-manga&op=&author=&artist=&release=&adult`; //headers -- TODO
            var url = this.getRequestWithHeaders(this.baseUrl + `/page/${page}?s=` + this.normalizeSearchQuery(query) + `&post_type=wp-manga&op=&author=&artist=&release=~adult`);
                        
            var options = {};
            
            options = {
                   uri: url,
                   headers: {
                       'Referer' : this.baseUrl
                   }
            };
            
            console.log("attempting to fetch search request for MadaraEXT - searchUrl is ", url);
            return options;
        }
        else {
            console.log("filters has properties");
            var url = this.baseUrl + `/page/${page}?s=&post_type=wp-manga&op=&author=&artist=&release=&adult`;
            if (!super.isEmpty(query)){
                url = super.addQueryParameter(url, "keyw", this.normalizeSearchQuery(query), false); //search query
            }
            var genreInclude = "";
            var genreExclude = "";

            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) {
                  case "sort":
                        url = super.addQueryParameter(url, "orby", filters[i].value, false);
                        break;
                  //incAndExcGenreFilter -- for doubletag type filter, paramKey won't be used, only includeKey and excludeKey, values are , separated list
                  case "g_i": //includeKey
                        genreInclude = '_' + filters[i].value.replace(",","_"); //values is comma list --- genreInclude need to be in form _##_##_##
                        break;
                  case "g_e": //excludeKey
                        genreExclude = '_' + filters[i].value.replace(",","_"); //values is comma list --- genreExclude need to be in form _##_##_##
                        break;
                  case "status":
                        url = super.addQueryParameter(url, "sts", filters[i].value, false);
                        break;
                  case "keyword":
                        url = super.addQueryParameter(url, "keyt", filters[i].value, false);
                        break;
                  default:
                    break;
                }
            }
            
            if (!super.isEmpty(genreInclude)){
                url = super.addQueryParameter(url, "g_i", genreInclude, false);
            }
            if (!super.isEmpty(genreExclude)){
                url = super.addQueryParameter(url, "g_e", genreExclude, false);
            }
                        
            var options = {};
            options = {
                   uri: url,
                   headers: {
                       'Referer' : this.baseUrl
                   }
            };
            console.log("attempting to fetch search request for MadaraEXT - searchUrl is ", url);
            return options;
        }
    }
    
    normalizeSearchQuery(query /*String*/) /*:String*/ {
        var query = query.toLowerCase();
        query = query.replace(/[àáạảãâầấậẩẫăằắặẳẵ]+/g, "a");
        query = query.replace(/[èéẹẻẽêềếệểễ]+/g, "e");
        query = query.replace(/[ìíịỉĩ]+/g, "i");
        query = query.replace(/[òóọỏõôồốộổỗơờớợởỡ]+/g, "o");
        query = query.replace(/[ùúụủũưừứựửữ]+/g, "u");
        query = query.replace(/[ỳýỵỷỹ]+/g, "y");
        query = query.replace(/[đ]+/g, "d");
        query = query.replace(" ","+"); //remove spaces //this is what will be in the URL _ instead of a space -- fixes search with spaces
        
        return query;
        
    }
    
        
    searchMangaParse(page /*Int*/, response /*String -- latestUpdatesResponse -- currentPageHtml */, query, filters){
        var page = parseInt(page);
        var searchMangaSelector = this.searchMangaSelector();
        var json = [];
        
        var $ = cheerio.load(response);
        $(searchMangaSelector).each(function (i, elem) {
            json.push(new MadaraEXT().searchMangaFromElement($(this)));
        });
        
        var page = parseInt(page); //important for nextPage = page + 1
        //console.log("finished parse json - ", json);
        var lastPageNumber = this.getLastPageNumberForSearch(response); //this should work on every page for this source
        console.log("lastPageNumber - ",lastPageNumber);
        var mangasPage = {};
        mangasPage.mangas = json;
        mangasPage.hasNextPage = lastPageNumber > page;
        mangasPage.nextPage = page + 1; //this doesn't matter if hasNextPage is false
        console.log("mangasPage -- ", mangasPage);

        var results = json.length;
        if (lastPageNumber != null && lastPageNumber > 0){
            results = results * lastPageNumber;
        }
        //return this.mangasPage(json, hasNextPage, nextPage, results);
        mangasPage.results = results;
        return mangasPage;
        //console.log(searchPageHtml);
    }
    
    getGenresList(){
        return {
            //'all':'ALL', //only for MangaBox -- not MadaraEXT
            '2':'Action',
            '3':'Adult',
            '4':'Adventure',
            '6':'Comedy',
            '7':'Cooking',
            '9':'Doujinshi',
            '10':'Drama',
            '11':'Ecchi',
            '12':'Fantasy',
            '13':'Gender bender',
            '14':'Harem',
            '15':'Historical',
            '16':'Horror',
            '45':'Isekai',
            '17':'Josei',
            '44':'Manhua',
            '43':'Manhwa',
            '19':'Martial arts',
            '20':'Mature',
            '21':'Mecha',
            '22':'Medical',
            '24':'Mystery',
            '25':'One shot',
            '26':'Psychological',
            '27':'Romance',
            '28':'School life',
            '29':'Sci fi',
            '30':'Seinen',
            '31':'Shoujo',
            '32':'Shoujo ai',
            '33':'Shounen',
            '34':'Shounen ai',
            '35':'Slice of life',
            '36':'Smut',
            '37':'Sports',
            '38':'Supernatural',
            '39':'Tragedy',
            '40':'Webtoons',
            '41':'Yaoi',
            '42':'Yuri'
        };
    }
}
