'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');

module.exports = class ReadM extends Source  {

    constructor() {
        super();
        this.baseUrl = 'https://readm.org';
    }
    
    searchMangaFromElementJSON(element) {
        const obj = JSON.parse(element)
        const allMangas = []
        for (var vals in obj.manga) {
        var url = obj.manga[vals].url;
        var name = obj.manga[vals].title;
        var thumbnail = `${this.baseUrl}${obj.manga[vals].image}`
        var rank = '0';
        allMangas.push({name, url, thumbnail,rank})
        }
        return allMangas;
    }
    
    latestUpdatesRequest(page) {
        return `${this.baseUrl}/latest-releases/${page}`;
    }
    
    latestUpdatesSelector() {
        return 'ul.latest-updates > li';
    }
    
    latestUpdatesFromElement(element) {
        var coverElement = element.find('h2 a').first();
        var url = coverElement.attr('href');
        var name = coverElement.text().trim();
        var thumbnail = `${this.baseUrl}${element.find('img').attr('data-src')}`;
        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }
    
    popularMangaRequest(page) {
        return `${this.baseUrl}/popular-manga/${page}`;
    }
    
    popularMangaSelector() {
        return 'div#discover-response li';
    }
    
    popularMangaFromElement(element) {
        var coverElement = element.find('div.subject-title a').first();
        var url = coverElement.attr('href');
        var name = coverElement.text().trim();
        var thumbnail = `${this.baseUrl}${element.find('img').attr('src')}`;
        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }

    getLastPageNumber(firstPageHtml,page){
        var $ = cheerio.load(firstPageHtml);
        var lastPageHREFText = $('div.pagination a:contains(»)').attr('href');
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
    
    chapterListSelector() {
        return "div.season_start";
    }
      
    chapterListRequest(seriesURL) {
        if(seriesURL.startsWith('http')){
            return seriesURL;
        }
        else {
            return super.chapterListRequest(seriesURL);
        }
    }
    
    mangaDetailsRequest(seriesURL) {
        if(seriesURL.startsWith('http')){
            return seriesURL;
        }
        else {
            return super.mangaDetailsRequest(seriesURL);
        }
    }
    
    chapterFromElement(chapterElement, source){
        var $ = cheerio.load(chapterElement);
        var chapterAElement = $('a');
        var url = chapterAElement.attr('href')
        var name = chapterAElement.text().trim();
        var scanlator = "";
        var date_upload = $('td.episode-date').text().trim();
        var volumeNumber = '';
        var chapterNumber = '';
        const regex = RegExp(/\b\d+\.?\d?\b/g);
        if (name != null){
            var numbers = name.match(regex);
            if (numbers != null){
                if(numbers.length > 0){
                    chapterNumber = numbers[0];
                    var indexOfFirstNumber = name.indexOf(numbers[0]);
                    var indexOfIssueNumberSign = name.indexOf('#');
                    if (indexOfFirstNumber > indexOfIssueNumberSign){
                        chapterNumber = numbers[0];
                    }
                    else if (numbers.length > 1){
                        chapterNumber = numbers[1];
                    }
                }
                else {
                    chapterNumber = "?";
                }
            }
            else {
                chapterNumber = "?";
            }
        } else {
            chapterNumber = "?";
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

    mangaDetailsParse(response, $, seriesURL){
        console.log("started mangaDetailsParse");
        if($ == null){
            $ = cheerio.load(response);
        }
        console.log("mangaDetailsParse loaded into cheerio");
        let title = $('h1.page-title').text().trim()
        let thumbnai = $('img.series-profile-thumb').attr('src');
        let author = $('span#first_episode a').text().trim();
        let artist = $('span#last_episode a').text().trim();
        let status = $('div.series-genres .series-status').first().text().toUpperCase().trim();
        var genres = [];
        if (typeof thumbnai === "undefined"){
            thumbnai = $('img.series-profile-thumb').attr('data-src');
        }
        var thumbnail =  `${this.baseUrl}${thumbnai}`
        $('div.series-summary-wrapper div.item a').each(function (i, chapterElement){
            var gen = $(chapterElement).text().trim();
            genres.push(gen);
        });
        let description = $('div.series-summary-wrapper p').text().trim();
        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }
    
    pageListSelector() {
        return "div.ch-images img";
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
             var url = `${thisReference.baseUrl}${$(pageElement).attr('src').trim()}`;
             var headers = {};
            headers['Referer'] = thisReference.pageListRequest(chapter);
            headers['Content-Type'] = 'image/jpeg';
            pages.push(thisReference.jsonBrowserifyRequest(url,null,null,headers,null));
        });
        console.log('ReadM pages', pages);
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
        console.log("fetchLatestManga -- ReadM");
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
            var mangaUpdate = new ReadM().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1;
            json.push(mangaUpdate);
        });
        
        var mangasPage = {};
        mangasPage.mangas = json;
        
        var lastPageNumber = this.getLastPageNumber(response,page);
        var hasNextPage = lastPageNumber > page;
        var nextPage = page + 1;
        
        var results = json.length;
        if (lastPageNumber != null && lastPageNumber > 0){
            results = results * lastPageNumber;
        }
        console.log("ReadM latest -- ", json);
        return super.mangasPage(json, hasNextPage, nextPage, results);
    }
    
    popularMangaParse(page, response){
        var page = parseInt(page);
        var $ = cheerio.load(response);
        
        var json = [];
        var popularMangaSelector = this.popularMangaSelector();
        
        var thisReference = this;
        $(popularMangaSelector).each(function (i, elem) {
            json.push(thisReference.popularMangaFromElement($(this)));
        });
        
        var lastPageNumber = this.getLastPageNumber(response,page);
        var hasNextPage = lastPageNumber > page;
        var nextPage = page + 1; 
        var results = json.length;
        
        if (lastPageNumber != null && lastPageNumber > 0){
            results = results * lastPageNumber;
        }
        return this.mangasPage(json, hasNextPage, nextPage, results);
    }
    fetchSourceInfo() {
        var sourceInfo = {};
        sourceInfo.requiresLogin = false;
        sourceInfo.url = this.baseUrl;
        sourceInfo.isCloudFlareSite = false;
        var filters = [];
        sourceInfo.filters = filters;
        console.log("ReadM sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
            var options = {
                'method': 'POST',
                'url': `${this.baseUrl}/service/search`,
                'headers': {
                  'X-Requested-With': 'XMLHttpRequest',
                  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
                form: {
                  'dataType': 'json',
                  'phrase': this.normalizeSearchQuery(query)
                }
            }
            console.log("attempting to fetch search request for ReadM - searchUrl is ", options);
            return options;
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
        query = query.replace(/%20/g, " ");
        query = query.replace(/_/g," ");
        query = query.replace(/\++/g," ");
        return query;
        
    }
        
    searchMangaParse(page, response, query, filters){
        var page = parseInt(page);
        var $ = cheerio.load(response);
        var searchMangaFromElementJSON = this.searchMangaFromElementJSON(response);
        var page = parseInt(page);
        var mangasPage = {};
        mangasPage.mangas = searchMangaFromElementJSON;
        mangasPage.hasNextPage = 1 > 1;
        mangasPage.nextPage = 1;
        mangasPage.results = 0;
        console.log("mangasPage -- ", mangasPage);
        return mangasPage;
    }
}
