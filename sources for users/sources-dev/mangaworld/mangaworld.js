'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');


module.exports = class Mangaworld extends Source  {

    constructor() {
        super();
        this.baseUrl = 'https://www.mangaworld.in';
    }
    
    searchMangaSelector() {
        return 'div.comics-grid .entry';
    }
    
    searchMangaFromElement(element) {
        return this.mangaFromElement(element);
    }
    
    mangaFromElement(element){
        var coverElement = element.find('a.manga-title').first();
        var url = super.substringAfterFirst('.in', 'https:' + coverElement.attr('href'));
        var name = coverElement.text();
        var thumbnai = element.find('a.thumb img').first().attr('src');
        var thumbnail =  thumbnai + '?'

        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }
    
    latestUpdatesRequest(page) {
        return `${this.baseUrl}/archive?sort=newest&page=${page}`;
    }
    
    latestUpdatesSelector() {
        return this.popularMangaSelector();
    }
    
    latestUpdatesFromElement(element) {
        var x = this.mangaFromElement(element);
        console.log("lastestManga -- ",x);
        return x;
    }
    
    popularMangaRequest(page) {
        return `${this.baseUrl}/archive?sort=most_read&page=${page}`;
    }
    
    popularMangaSelector() {
        return 'div.comics-grid .entry';
    }
    
    popularMangaFromElement(element) {
        return this.mangaFromElement(element);
    }
    
    chapterListSelector() {
        return "div.chapters-wrapper div.chapter";
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
        var url = super.substringAfterFirst(this.baseUrl, chapterAElement.attr('href'));
        var name = $(".d-inline-block").text();
        var scanlator = "";
        var date_upload = $('.chap-date').text();
        var volumeNumber = '';
        var chapterNumber = '';
        const regex = RegExp(/\b\d+\.?\d?\b/g);
        if (name != null){
            var numbers = name.match(regex);
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
                        if(numbers.length > 1){
                            if((name.startsWith('v') || name.startsWith('V'))){
                                volumeNumber = numbers[0];
                                chapterNumber = numbers[1];
                            }
                            else {
                                chapterNumber = numbers[0];
                            }
                        }
                        else {
                            chapterNumber = numbers[0];
                        }
                    }
                    
                    if(chapterNumber != '' && numbers.length > 1 && volumeNumber == ''){
                        if (name.includes('volume') || name.includes('Volume')){
                            volumeNumber = numbers[1];
                        }
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
        
        
        return super.chapter(url, "Italian", volumeNumber, chapterNumber, name, date_upload, scanlator);
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
        let title = $('div.info h1.name').text().trim();
        let thumbnai = $('div.comic-info div.thumb > img').attr('src');
        let author = $(`div.comic-info a[href^="${this.baseUrl}/archive?author="]`).text().trim();
        let artist = $(`div.comic-info a[href^="${this.baseUrl}/archive?artist="]`).text().trim();
        let status = $(`div.comic-info a[href^="${this.baseUrl}/archive?status="]`).text().toUpperCase().trim();
        if(status.includes("IN CORSO")){
            status = "ONGOING"
        }else if(status.includes("FINITO")){
            status = "COMPLETED"
        }else if(status.includes("DROPPATO")){
            status = "DROPPED"
        }else if(status.includes("IN PAUSA")){
            status = "ON HOLD"
        }else if(status.includes("CANCELLATO")){
            status = "CANCELED"
        }
        var genres = [];
        var thumbnail =  thumbnai + '?'
        $('div.comic-info div.meta-data a.badge').each(function (i, chapterElement){
            var gen = $(chapterElement).text();
            genres.push(gen);
        });
        let description = $('div#noidungm').text().trim();
        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }
    pageListSelector() {
        return "div#page img.page-image";
    }
    checkurl(chapter){
        if (chapter.includes("?style=list")){
            return chapter
        } else {
            return chapter + "?style=list"
        }
    }
    pageListRequest(chapter) {
        if(chapter.chapter.startsWith('http')){
            return this.checkurl(chapter.chapter);
        }
        else {
            return this.checkurl(super.pageListRequest(chapter));
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
             var url = $(pageElement).attr('src');
             var headers = {};
            headers['Referer'] = thisReference.pageListRequest(chapter);
            headers['Content-Type'] = 'image/jpeg';
            pages.push(thisReference.jsonBrowserifyRequest(url,null,null,headers,null));
        });
        console.log('Mangaworld pages', pages);
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
        console.log("fetchLatestManga -- Mangaworld");
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
            var mangaUpdate = new Mangaworld().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1;
            json.push(mangaUpdate);
        });
        
        console.log("Mangaworld latest -- ", json);
        
        var mangasPage = {};
        mangasPage.mangas = json;
        
        
        var hasNextPage = (json.length >= 16);
        var nextPage = page + 1;
        
  
        var results = json.length;
        if (hasNextPage){
          results = results * 1;
        }
        
        return super.mangasPage(json, hasNextPage, nextPage, results);
    }
    async fetchPopularManga(page){
        console.log(`using default implementation of fetchPopularManga(${page})`);
        var page = parseInt(page);
        
        console.log("url-- ", this.popularMangaRequest(`${page}`));
        var currentPageHtml = await this.send_request(this.popularMangaRequest(`${page}`));
        return this.popularMangaParse(page, currentPageHtml);
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
        
        var hasNextPage = (json.length >= 16);
        var nextPage = page + 1;
        var results = json.length;
        
        if (hasNextPage){
            results = results * 1;
        }
        return this.mangasPage(json, hasNextPage, nextPage, results);
    }
    fetchSourceInfo() {
        var sourceInfo = {};
        sourceInfo.requiresLogin = false;
        sourceInfo.url = this.baseUrl;
        sourceInfo.isCloudFlareSite = false;
        
        var filters = [];
        
        var GeneresLISTS = {};
        GeneresLISTS.paramKey = 'genres';
        GeneresLISTS.displayName = 'Generi';
        GeneresLISTS.type = 'tag';
        GeneresLISTS.options = this.getGenresList();
        
        var sortFilter = {};
        sortFilter.paramKey = 'sort';
        sortFilter.displayName = 'Ordina per';
        sortFilter.type = 'sort';
        sortFilter.options = {};
        sortFilter.options['most_read'] = 'Più letti';
        sortFilter.options['less_read'] = 'Meno letti';
        sortFilter.options['newest'] = 'Più recenti';
        sortFilter.options['oldest'] = 'Meno recenti';
        sortFilter.options['a-z'] = 'A-Z';
        sortFilter.options['z-a'] = 'Z-A';

        var statusFilter = {};
        statusFilter.paramKey = 'status';
        statusFilter.displayName = 'Stato';
        statusFilter.type = 'choice';
        statusFilter.options = {};
        statusFilter.options['ongoing'] = 'In corso';
        statusFilter.options['completed'] = 'Finito';
        statusFilter.options['dropped'] = 'Droppato';
        statusFilter.options['paused'] = 'In pausa';
        statusFilter.options['canceled'] = 'Cancellato';
        
        var TypesListFilter = {};
        TypesListFilter.paramKey = 'typelist';
        TypesListFilter.displayName = 'Tipo';
        TypesListFilter.type = 'choice';
        TypesListFilter.options = {};
        TypesListFilter.options['manga'] = 'Manga';
        TypesListFilter.options['manhua'] = 'Manhua';
        TypesListFilter.options['manhwa'] = 'Manhwa';
        TypesListFilter.options['oneshot'] = 'Oneshot';
        TypesListFilter.options['thai'] = 'Thai';
        TypesListFilter.options['vietnamese'] = 'Vietnamita';

        filters.push(GeneresLISTS);
        filters.push(sortFilter);
        filters.push(statusFilter);
        filters.push(TypesListFilter)
        
        sourceInfo.filters = filters;
        
        console.log("Mangaworld sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
        console.log("Mangaworld filters -- ", filters);
        var query = query.replace(/_/g,"%20");
        if (Object.keys(filters).length === 0) {
            console.log("filters are empty");
            var url = `${this.baseUrl}/archive?page=${page}&keyword=${this.normalizeSearchQuery(query)}&sort=a-z`
            console.log("attempting to fetch search request for Mangaworld - searchUrl is ", url);
            var options = {};
            
            options = {
                   uri: url,
                   headers: {
                       'Referer' : this.baseUrl
                   }
            };
            
            return options;
        }
        else {
            console.log("filters has properties");
            var query = query.replace(/_/g,"%20");
            var url = `${this.baseUrl}/archive?page=${page}`;
            if (!super.isEmpty(query)){
                url = super.addQueryParameter(url, "keyword", this.normalizeSearchQuery(query), false);
            } else {
                url = super.addQueryParameter(url, "keyword", "", false);
            }

            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) {
                  case "sort":
                        url = super.addQueryParameter(url, "sort", filters[i].value, false);
                        break;
                  case "genres":
                  let filtes = filters[i].value
                  let bois = filtes.replace(/,/g,"&genre=")
                  url = super.addQueryParameter(url, "genre", bois, false);
                  break;
                  case "status":
                        url = super.addQueryParameter(url, "status", filters[i].value, false);
                        break;
                  case "typelist":
                        url = super.addQueryParameter(url, "type", filters[i].value, false);
                        break;
                  default:
                    break;
                }
            }
            var options = {};
            options = {
                   uri: url,
                   headers: {
                       'Referer' : this.baseUrl
                   }
            };

            console.log("attempting to fetch search request for Mangaworld - searchUrl is ", url);
            return options;
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
        query = query.replace(/ /g,"%20");
        query = query.replace(/%20/g, "%20");
        return query;
        
    }
    
        
    searchMangaParse(page, response, query, filters){
        var page = parseInt(page);
        var searchMangaSelector = this.searchMangaSelector();
        var json = [];
        
        var $ = cheerio.load(response);
        $(searchMangaSelector).each(function (i, elem) {
            json.push(new Mangaworld().searchMangaFromElement($(this)));
        });
        
        var page = parseInt(page);
        var mangasPage = {};
        mangasPage.mangas = json;
        mangasPage.hasNextPage = (json.length >= 16);
        mangasPage.nextPage = page + 1;
        console.log("mangasPage -- ", mangasPage);

        var results = json.length;
        if (mangasPage.hasNextPage){
          results = results * 1;
        }
        mangasPage.results = results;
        return mangasPage;
    }
    
    getGenresList(){
        return {
            "adulti": "Adulti",
            "arti-marziali": "Arti Marziali",
            "avventura": "Avventura",
            "azione": "Azione",
            "commedia": "Commedia",
            "doujinshi": "Doujinshi",
            "drammatico": "Drammatico",
            "ecchi": "Ecchi",
            "fantasy": "Fantasy",
            "gender-bender": "Gender Bender",
            "harem": "Harem",
            "hentai": "Hentai",
            "horror": "Horror",
            "josei": "Josei",
            "lolicon": "Lolicon",
            "maturo": "Maturo",
            "mecha": "Mecha",
            "mistero": "Mistero",
            "psicologico": "Psicologico",
            "romantico": "Romantico",
            "sci-fi": "Sci-fi",
            "scolastico": "Scolastico",
            "seinen": "Seinen",
            "shotacon": "Shotacon",
            "shoujo": "Shoujo",
            "shoujo-ai": "Shoujo Ai",
            "shounen": "Shounen",
            "shounen-ai": "Shounen Ai",
            "slice-of-life": "Slice of Life",
            "smut": "Smut",
            "soprannaturale": "Soprannaturale",
            "sport": "Sport",
            "storico": "Storico",
            "tragico":"Tragico",
            "yaoi": "Yaoi",
            "yuri": "Yuri"
        };
    }
}
