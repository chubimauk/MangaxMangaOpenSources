'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');


module.exports = class ToonilyCom extends Source  {

    constructor() {
        super();
        this.baseUrl = 'https://toonily.com';
        
    }
    getRequestWithHeaders(method,url) {
        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0';
        var hosts = this.baseUrl.replace(/^(https?:|)\/\//, '')
               var options = {
                'method': method,
                'url': url,
                'headers': {
                  'Host': hosts,
                  'User-Agent': userAgent,
                  'Referer': this.baseUrl,
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                  'Accept-Language': 'en-us',
                  'Connection': 'keep-alive',
                  'X-Requested-With': 'XMLHttpRequest',
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
    
    searchMangaFromElement(element) {
        return this.mangaFromElement(element);
    }
    
    mangaFromElement(element){
        var coverElement = element.find('h3 a').first();
        var url = super.substringAfterFirst('.com', 'https:' + coverElement.attr('href'));
        var name = coverElement.text();
        var thumbnai = element.find('img').attr('data-src');
        var rank = '0';
        if (typeof thumbnai === undefined){
            thumbnai = element.find('img').attr('src');
        }
        var thumbnail =  thumbnai + '?'
        return super.manga(name,url,thumbnail,rank);
    }
    
    latestUpdatesRequest(page) {
        return this.getRequestWithHeaders("GET",`${this.baseUrl}/page/${page}?s=&post_type=wp-manga&m_orderby=latest`); //headers?
    }
    
    latestUpdatesSelector() {
        return this.popularMangaSelector();
    }
    
    latestUpdatesFromElement(element) {
        return this.mangaFromElement(element)
    }
    popularMangaRequest(page) {
        return this.getRequestWithHeaders("GET",`${this.baseUrl}/page/${page}/?s=&post_type=wp-manga&m_orderby=views`); //headers?
    }
    
    popularMangaSelector() {
        return 'div.c-tabs-item__content';
    }
    
    popularMangaFromElement(element) {
        return this.mangaFromElement(element);
    }

    getLastPageNumber(firstPageHtml,page){
        var $ = cheerio.load(firstPageHtml);
        var lastPageHREFText = $('a.nextpostslink').attr('href');
        if (lastPageHREFText === undefined) {
            return parseInt(page);
        } else {
            var lastNumbersOnly = lastPageHREFText.match(/\d/g);
            var lastNumber = 0;
            if (lastNumbersOnly != null && lastNumbersOnly.length > 0){
                lastNumber = lastNumbersOnly.join('');
            }
            return parseInt(lastNumber);
        }

    }
    
    getLastPageNumberForLatest(latestPageHtml,page){
        return this.getLastPageNumber(latestPageHtml,page);
    }
    
    getLastPageNumberForSearch(searchPageHtml,page){
        return this.getLastPageNumber(searchPageHtml,page);
    }
    
    chapterListSelector() {
        return "li.wp-manga-chapter";
    }
    
    
    
    chapterListRequest(seriesURL) {
        if(seriesURL.startsWith('http')){
            return this.getRequestWithHeaders("GET",seriesURL);
        }
        else {
            return this.getRequestWithHeaders("GET",super.chapterListRequest(seriesURL));
        }
    }
    
    mangaDetailsRequest(seriesURL) {
        if(seriesURL.startsWith('http')){
            return this.getRequestWithHeaders("GET",seriesURL);
        }
        else {
            return this.getRequestWithHeaders("GET",super.mangaDetailsRequest(seriesURL));
        }
    }
    
    chapterFromElement(chapterElement, source){
        var $ = cheerio.load(chapterElement);
        
        var chapterAElement = $('a');
        var url = super.substringAfterFirst(this.baseUrl, chapterAElement.attr('href'));
        var name = chapterAElement.text().trim();
        var scanlator = "";
        var date_upload = $('span').last().text().trim();

        var volumeNumber = '';
        var chapterNumber = '';
        const regex = RegExp(/\b\d+\.?\d?\b/g);
        if (name != null){
            var numbers = name.match(regex);
            //console.log(`title numbers -- , ${numbers}, name -- , ${name}`);
            if (numbers != null){
                if(numbers.length > 0){
                    var indexOfFirstNumber = name.indexOf(numbers[0]);
                    var indexOfCh = name.indexOf('Ch');
                    var indexOfAllLittleCH = name.indexOf('ch');
                    var indexOfAllCapCH = name.indexOf('CH');
                    console.log("index of first number -- ", indexOfFirstNumber);
                    if (indexOfFirstNumber > indexOfCh && indexOfCh > -1){
                        chapterNumber = numbers[0];
                    }
                    else if (indexOfFirstNumber > indexOfAllLittleCH && indexOfAllLittleCH > -1){
                        chapterNumber = numbers[0];
                    }
                    else if (indexOfFirstNumber > indexOfAllCapCH && indexOfAllCapCH > -1){
                        chapterNumber = numbers[0];
                    }
                    else {
                        //have not set the chapter number yet from the first number
                        if(numbers.length > 1){
                            if((name.startsWith('v') || name.startsWith('V'))){
                                //first number is volume
                                volumeNumber = numbers[0];
                                chapterNumber = numbers[1];
                            }
                            else {
                                //probably never happen but, in the case where first number is not after chapter and we don't start with v, just use the first number as chapter
                                chapterNumber = numbers[0];
                                //second number is useless
                            }
                        }
                        else {
                            //if there's only one number, just assume it is the chapter
                            chapterNumber = numbers[0];
                        }
                    }
                    
                    //check if possibly Volume is listed after chapter (very rare e.g. Chapter 108.5: Volume 12 Omake -- Boku No Hero Academia)
                    if(chapterNumber != '' && numbers.length > 1 && volumeNumber == ''){
                        //chapter set, volume not set and we have one more number
                        if (name.includes('volume') || name.includes('Volume')){
                            //fuck it just use the second number as the volume then
                            volumeNumber = numbers[1];
                        }
                    }
                }
                else {
                    chapterNumber = "?"; //no numbers at all
                }
            }
            else {
                chapterNumber = "?";
            }
        } else {
            chapterNumber = "?"; //no name, no chapter
        }
        return super.chapter(url, "English", volumeNumber, chapterNumber, name, date_upload, scanlator);
    }
    
     chapterListParse(response, $, seriesURL){
         console.log("started chapterListParse");
         if($ == null){
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

    mangaDetailsParse(response, $, seriesURL){
        console.log("started mangaDetailsParse");
        if($ == null){
            $ = cheerio.load(response);
        }
        console.log("mangaDetailsParse loaded into cheerio");
        let title = $('div.post-title h1').text().trim();
        let thumbnai = $('div.summary_image img').attr('data-src');
        let table = $('div.summary_content');
        let author = $('div.author-content > a').text();
        let artist = $('div.artist-content > a').text();  
        let status = $('div.post-status div.summary-content').text().toUpperCase().trim();
        if(status.includes("\nONGOING") || status.includes("\nCOMPLETED") || status.includes("\nCANCELED") || status.includes("\nOn Hiatus")){
            status = this.substringAfterLast("\n",status)
        }
        var genres = [];
        if (typeof thumbnai === undefined){
            thumbnai = $('div.summary_image img').attr('src');
        }
        var thumbnail =  thumbnai + '?'
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
            return chapter.chapter;
        }
        else {
            return super.pageListRequest(chapter);
        }
    }
    
    
    async fetchPageList(chapter){
        var pageListResponse = await this.send_request(this.pageListRequest(chapter));
        return this.pageListParse(pageListResponse,chapter);
    }
    
    pageListParse(pageListResponse,chapter){
        var $ = cheerio.load(pageListResponse);
        var thisReference = this;
        var pages = [];
        $(this.pageListSelector()).each(function (i, pageElement){
             var urs = $(pageElement).attr('data-src');
             var url = urs.replace('\t\t\t\t\t\t', '');
             var headers = {};
            headers['Referer'] = thisReference.pageListRequest(chapter);
            headers['Content-Type'] = 'image/jpeg';
            pages.push(thisReference.jsonBrowserifyRequest(url,null,null,headers,null));
        });
        console.log('ToonilyCom pages', pages);
        return pages;
    }
    
    async fetchPageImage(page){
        const options = {
          url: page.url,
          encoding: null,
          resolveWithFullResponse: false,
          headers : {
              'Referer': page['headers']['Referer']
          }
        };
        
        console.log("fetchPageImage options -", options);
        var image = await rp(options)
        .then(function (response) {
              return response;
        })
        .catch(function (err) {
               return err;
        });
        
        return image;
    }

    
    async fetchLatestManga(page){
        console.log("fetchLatestManga -- ToonilyCom");
        var page = parseInt(page);
        
        var currentPageHtml = await this.send_request(this.latestUpdatesRequest(`${page}`));
        return this.latestUpdatesParse(page, currentPageHtml);
    }
    
    latestUpdatesParse(page, response){
        var page = parseInt(page);
        var latestUpdatesSelector = this.latestUpdatesSelector();
        var $ = cheerio.load(response);

        var json = [];
        $(latestUpdatesSelector).each(function (i, elem) {
            var mangaUpdate = new ToonilyCom().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1;
            json.push(mangaUpdate);
        });
        
        console.log("ToonilyCom latest -- ", json);
        
        var mangasPage = {};
        mangasPage.mangas = json;
        
        
        var lastPageNumber = this.getLastPageNumberForLatest(response,page);
        var hasNextPage = lastPageNumber > page;
        var nextPage = page + 1;
        
        var results = json.length;
        if (lastPageNumber != null && lastPageNumber > 0){
            results = results * lastPageNumber;
        }
        
        return super.mangasPage(json, hasNextPage, nextPage, results);
    }
    
    fetchSourceInfo() {
        var sourceInfo = {};
        sourceInfo.requiresLogin = false;
        sourceInfo.url = this.baseUrl;
        sourceInfo.isCloudFlareSite = false;
        
        var filters = [];
        
        var GeneresLISTS = {};
        GeneresLISTS.paramKey = 'genres';
        GeneresLISTS.displayName = 'Genres List';
        GeneresLISTS.type = 'tag';
        GeneresLISTS.options = this.getGenresList();
        
        var sortFilter = {};
        sortFilter.paramKey = 'sort';
        sortFilter.displayName = 'Sort';
        sortFilter.type = 'sort';
        sortFilter.options = {};
        sortFilter.options['latest'] = 'Latest updates';
        sortFilter.options['views'] = 'Top View';
        sortFilter.options['trending'] = 'Treding Manga';
        sortFilter.options['new-manga'] = 'New manga';
        sortFilter.options['rating'] = 'Ratings';
        sortFilter.options['alphabet'] = 'A-Z';

        var statusFilter = {};
        statusFilter.paramKey = 'status';
        statusFilter.displayName = 'Status';
        statusFilter.type = 'choice';
        statusFilter.options = {};
        statusFilter.options['end'] = 'Completed';
        statusFilter.options['on-going'] = 'OnGoing';
        statusFilter.options['canceled'] = 'Canceled';
        statusFilter.options['on-hold'] = 'On Hold';

        filters.push(GeneresLISTS);
        filters.push(sortFilter);
        filters.push(statusFilter);
        
        sourceInfo.filters = filters;
        
        console.log("ToonilyCom sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
        console.log("ToonilyCom filters -- ", filters);
        var query = query = query.replace(/_/g,"+");
        if (Object.keys(filters).length === 0) {
            console.log("filters are empty");
            var url = this.getRequestWithHeaders("GET",this.baseUrl + `/page/${page}?s=` + this.normalizeSearchQuery(query) + `&post_type=wp-manga`);
            console.log("attempting to fetch search request for ToonilyCom - searchUrl is ", url);
            return url;
        }
        else {
            console.log("filters has properties");
            var query = query = query.replace(/_/g,"+");
            var url = `${this.baseUrl}/page/${page}`;
            if (!super.isEmpty(query)){
                url = super.addQueryParameter(url, "s", this.normalizeSearchQuery(query) + "&post_type=wp-manga", true);
            } else {
                url = super.addQueryParameter(url, "s", "&post_type=wp-manga", true);
            }

            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) {
                  case "sort":
                        url = super.addQueryParameter(url, "m_orderby", filters[i].value, false);
                        break;
                  case "genres":
                  let filtes = filters[i].value
                  let bois = filtes.replace(/,/g,"&genre[]=")
                  url = super.addQueryParameter(url, "genre[]", bois, false);
                  break;
                  case "status":
                        url = super.addQueryParameter(url, "status[]", filters[i].value, false);
                        break;
                  default:
                    break;
                }
            }
            let finsihedur = this.getRequestWithHeaders("GET",url);

            console.log("attempting to fetch search request for ToonilyCom - searchUrl is ", url);
            return finsihedur;
        }
    }
    
    normalizeSearchQuery(query) {
        var query = query.toLowerCase();
        query = query.replace(/[àáạảãâầấậẩẫăằắặẳẵ]+/g, "a");
        query = query.replace(/[èéẹẻẽêềếệểễ]+/g, "e");
        query = query.replace(/[ìíịỉĩ]+/g, "i");
        query = query.replace(/[òóọỏõôồốộổỗơờớợởỡ]+/g, "o");
        query = query.replace(/[ùúụủũưừứựửữ]+/g, "u");
        query = query.replace(/[ỳýỵỷỹ]+/g, "y");
        query = query.replace(/[đ]+/g, "d");
        query = query.replace(/ /g,"_");
        query = query.replace(/%20/g, "_");
        return query;
        
    }
    
        
    searchMangaParse(page, response, query, filters){
        var page = parseInt(page);
        var searchMangaSelector = this.searchMangaSelector();
        var json = [];
        
        var $ = cheerio.load(response);
        $(searchMangaSelector).each(function (i, elem) {
            json.push(new ToonilyCom().searchMangaFromElement($(this)));
        });
        
        var page = parseInt(page);
        var lastPageNumber = this.getLastPageNumberForSearch(response,page);
        console.log("lastPageNumber - ",lastPageNumber);
        var mangasPage = {};
        mangasPage.mangas = json;
        mangasPage.hasNextPage = lastPageNumber > page;
        mangasPage.nextPage = page + 1;
        console.log("mangasPage -- ", mangasPage);

        var results = json.length;
        if (lastPageNumber != null && lastPageNumber > 0){
            results = results * lastPageNumber;
        }
        mangasPage.results = results;
        return mangasPage;
    }
    
    getGenresList(){
        return {
            'action-webtoon':'Action',
            'adventure-webtoon':'Adventure',
            'age-gap':'Age Gap',
            'all-ages':'All Ages',
            'bdsm':'BDSM',
            'campus':'Campus',
            'comedy-webtoon':'Comedy',
            'crime':'Crime',
            'drama-webtoon':'Drama',
            'fantasy-webtoon':'Fantasy',
            'female-friend':'Female Friend',
            'gender-bender':'Gender Bender',
            'gossip':'Gossip',
            'harem-webtoon':'Harem',
            'webtoon-historical':'Historical',
            'horror-webtoon':'Horror',
            'incest':'Incest',
            'isekai':'Isekai',
            'josei-manga':'Josei',
            'magic':'Magic',
            'martial-arts':'Martial Arts',
            'mature-webtoon':'Mature',
            'mystery-webtoon':'Mystery',
            'ntr-webtoon':'NTR',
            'office':'Office',
            'psychological-webtoon':'Psychological',
            'rape':'Rape',
            'reincarnation':'Reincarnation',
            'revenge':'Revenge',
            'reverse-harem':'Reverse Harem',
            'romance-webtoon':'Romance',
            'school-life-webtoon':'School Life',
            'scifi-webtoon':'Sci-Fi',
            'secret-relationship':'Secret Relationship',
            'seinen-webtoon':'Seinen',
            'shoujo':'Shoujo',
            'shounen-webtoon':'Shounen',
            'sliceoflife-webtoon':'Slice Of Life',
            'sports':'Sports',
            'supernatural-webtoon':'Supernatural',
            'thriller-webtoon': 'Thriller',
            'tragedy': 'Tragedy',
            'uncensored': 'Uncensored',
            'work-life': 'Work Life',
            'yaoi-webtoon': 'Yaoi',
            'yuri-webtoon': 'Yuri'
        };
    }
}
