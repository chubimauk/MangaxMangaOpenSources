'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');

module.exports = class MangaScanCC extends Source  {

    constructor() {
        super();
        this.baseUrl = 'https://mangascan.cc';
    }

    searchMangaFromElementJSON(element) {
        const obj = JSON.parse(element.text().trim())
        const allMangas = []
        for (var vals in obj. suggestions) {
        var url = `/manga/${obj.suggestions[vals].data}`;
        var name = obj.suggestions[vals].value;
        var thumbnail = `${this.baseUrl}/uploads${url}/cover/cover_250x350.jpg`
        var rank = '0';
        allMangas.push({name, url, thumbnail,rank})
        }
        return allMangas;
    }
    searchMangaFromElement(element) {
        var coverElement = element.find('a').first();
        var url = super.substringAfterFirst('.cc', 'https:' + coverElement.attr('href'));
        var name = element.find("strong").text();
        var thumbnail = element.find('img').first().attr('src');       
        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }
    getNextPage(element){
        var $ = cheerio.load(element);
        var nextPage = $('a[rel="next"]');
        if (nextPage.contents().length !== 0) {
            return true;
        } else {
            return false;
        }
    }

    searchMangaSelector() {
        return 'div.col-sm-6';
    }
    latestUpdatesRequest(page) {
        return `${this.baseUrl}/latest-release?page=${page}`;
    }
    
    latestUpdatesSelector() {
        return "div.mangalist div.manga-item"
    }
    
    latestUpdatesFromElement(element) {
        var coverElement = element.find('h3 a').first();
        var url = super.substringAfterFirst('.cc', 'https:' + coverElement.attr('href'));
        var name = coverElement.text();
        var thumbnail = `${this.baseUrl}/uploads/manga/${super.substringAfterLast('/',url)}/cover/cover_250x350.jpg`   
        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }
    
    popularMangaRequest(page) {
        return `${this.baseUrl}/filterList?page=${page}&sortBy=views&asc=false`;
    }
    
    popularMangaSelector() {
        return 'div.col-sm-6';
    }
    
    popularMangaFromElement(element) {
        var coverElement = element.find('a').first();
        var url = super.substringAfterFirst('.cc', 'https:' + coverElement.attr('href'));
        var name = element.find("strong").text();
        var thumbnail = element.find('img').first().attr('src');       
        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }

    chapterListSelector() {
        return "ul[class^=chapters] > li:not(.btn), table.table tr";
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
        var name = chapterAElement.text();
        var scanlator = "";
        var date_upload = $('div.date-chapter-title-rtl').last().text().trim();

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
        
        return super.chapter(url, "French", volumeNumber, chapterNumber, name, date_upload, scanlator);
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
    coverGuess(url,mangaUrl){
        console.log(url)
        if (url.endsWith("no-image.png")){
          return `${this.baseUrl}/uploads/manga/${super.substringAfterLast('/',mangaUrl)}/cover/cover_250x350.jpg`
        } else {
            return url
        }
    }

    mangaDetailsParse(response, $, seriesURL){
        console.log("started mangaDetailsParse");
        if($ == null){
            $ = cheerio.load(response);
        }
        console.log("mangaDetailsParse loaded into cheerio");
        let title = $('h2.listmanga-header, h2.widget-title').first().text().trim();
        let thumbnail = this.coverGuess($('.row [class^=img-responsive]').attr('src'),seriesURL) + '?'
        let author = $(".col-sm-8 dt:contains('Auteur(s)')").next().text().trim()
        let artist = $(".col-sm-8 dt:contains('Artiste(s)')").next().text().trim()
        let status = $(`.col-sm-8 dt:contains('Statut')`).next().text().trim().replace(/Terminé/gi,'COMPLETED').replace(/En cours/gi,'ONGOING');
        var genres = $('.col-sm-8 dt:contains("Catégories")').next().text().trim().replace(/\n/g,'').replace(/\s/g, '').split(/,/g)
        let description = $('.row .well p').text().trim();
        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }
    pageListSelector() {
        return "#all > .img-responsive";
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
            var url = $(pageElement).attr('data-src').trim();
            if (typeof url === undefined){
              url = $(pageElement).attr('src').trim();
            }
            var headers = {};
            headers['Referer'] = thisReference.pageListRequest(chapter);
            headers['Content-Type'] = 'image/jpeg';
            pages.push(thisReference.jsonBrowserifyRequest(url,null,null,headers,null));
        });
        console.log('MangaScanCC pages', pages);
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
        console.log("fetchLatestManga -- MangaScanCC");
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
            var mangaUpdate = new MangaScanCC().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1;
            json.push(mangaUpdate);
        });
        
        console.log("Onma latest -- ", json);
        
        var mangasPage = {};
        mangasPage.mangas = json;
        
        
        var hasNextPage = this.getNextPage(response);
        var nextPage = page + 1;
        var results = json.length;
        
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
        
        var hasNextPage = this.getNextPage(response);
        var nextPage = page + 1;
        var results = json.length;
        return this.mangasPage(json, hasNextPage, nextPage, results);
    }
    fetchSourceInfo() {
        var sourceInfo = {};
        sourceInfo.requiresLogin = false;
        sourceInfo.url = this.baseUrl;
        sourceInfo.isCloudFlareSite = false;
        
        var filters = [];
        var authorArtistFilter = {}; 
        authorArtistFilter.paramKey = 'author';
        authorArtistFilter.displayName = 'Author';
        authorArtistFilter.type = 'text';

        var GeneresLISTS = {};
        GeneresLISTS.paramKey = 'category';
        GeneresLISTS.displayName = 'Category';
        GeneresLISTS.type = 'choice';
        GeneresLISTS.options = this.getGenresList();

        var sortFilter = {};
        sortFilter.paramKey = 'sort';
        sortFilter.displayName = 'Sort by';
        sortFilter.type = 'sort';
        sortFilter.options = {};
        sortFilter.options['name'] = 'Name';
        sortFilter.options['views'] = 'Popularity';
        sortFilter.options['last_release'] = 'Last update';
        sortFilter.default = 'name';

        var AlphabetLISTS = {};
        AlphabetLISTS.paramKey = 'alphabet';
        AlphabetLISTS.displayName = 'Begins with';
        AlphabetLISTS.type = 'choice';
        AlphabetLISTS.options = this.getAlphabetList();

        var AscendingLISTS = {};
        AscendingLISTS.paramKey = 'ascending';
        AscendingLISTS.displayName = 'Ascending';
        AscendingLISTS.type = 'choice';
        AscendingLISTS.options = {};
        AscendingLISTS.options['true'] = 'True';
        AscendingLISTS.options['false'] = 'False';
        AscendingLISTS.default = 'false';

        filters.push(authorArtistFilter);
        filters.push(GeneresLISTS);
        filters.push(sortFilter);
        filters.push(AlphabetLISTS);
        filters.push(AscendingLISTS);

        sourceInfo.filters = filters;
        sourceInfo.displayInfo = [];
        
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language",["French","English"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content",["Manga","Manwha","Manhua"],["#4D83C1","#4D83C1","#4D83C1"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor",["xOnlyFadi"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker",["No"],[]));
        console.log("MangaScanCC sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
        console.log("MangaScanCC filters -- ", filters);
        var query = query.replace(/_/g,"%20");
        if (Object.keys(filters).length === 0) {
            console.log("filters are empty");
            var url = `${this.baseUrl}/search?query=${this.normalizeSearchQuery(query)}`;            
            var options = {};
            
            options = {
                   uri: url,
                   headers: {
                       'Referer' : this.baseUrl
                   }
            };
            
            console.log("attempting to fetch search request for MangaScanCC - searchUrl is ", url);
            return options;
        }
        else {
            console.log("filters has properties");
            var url = `${this.baseUrl}/filterList?page=${page}`;
            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) {
                  case "category":
                        url = super.addQueryParameter(url, "cat", filters[i].value, false);
                        break;
                  case "alphabet":
                        url = super.addQueryParameter(url, "alpha", filters[i].value, false);
                        break;
                  case "sort":
                        url = super.addQueryParameter(url, "sortBy", filters[i].value, false);
                        break;
                  case "ascending":
                        url = super.addQueryParameter(url, "asc", filters[i].value, false);
                        break;
                  case "author":
                        url = super.addQueryParameter(url, "author", filters[i].value, false);
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
            console.log("attempting to fetch search request for MangaScanCC - searchUrl is ", url);
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
        if (Object.keys(filters).length === 0){
            console.log("MangaScanCC filters are empty")
            var page = parseInt(page);
            var $ = cheerio.load(response);
            var body = $("body")
            var searchMangaFromElementJSON = this.searchMangaFromElementJSON(body);
            var page = parseInt(page);
            var mangasPage = {};
            mangasPage.mangas = searchMangaFromElementJSON;
            mangasPage.hasNextPage = 1 > 1;
            mangasPage.nextPage = 1;
            mangasPage.results = 0;
            console.log("mangasPage -- ", mangasPage);
            return mangasPage;
        } else {
            console.log("MangaScanCC Has filters")
            var page = parseInt(page);
            var searchMangaSelector = this.searchMangaSelector();
            var json = [];
            var $ = cheerio.load(response);
            $(searchMangaSelector).each(function (i, elem) {
                json.push(new MangaScanCC().searchMangaFromElement($(this)));
            });
            var page = parseInt(page);
            var mangasPage = {};
            mangasPage.mangas = json;
            mangasPage.hasNextPage = this.getNextPage(response);
            mangasPage.nextPage = page + 1;
            mangasPage.results = json.length;
            console.log("mangasPage -- ", mangasPage);
            return mangasPage;
    }
}
    
    getGenresList(){
        return {
            "1": "Action",
            "2": "Aventure",
            "3": "Comédie",
            "4": "Doujinshi",
            "5": "Drame",
            "6": "Ecchi",
            "7": "Fantasy",
            "8": "Gender Bender",
            "9": "Harem",
            "10": "Historique",
            "11": "Horreur",
            "12": "Josei",
            "13": "Arts martiaux",
            "14": "Mature",
            "15": "Mecha",
            "16": "Mystère",
            "17": "One Shot",
            "18": "Psychologique",
            "19": "Romance",
            "20": "School Life",
            "21": "Science-fiction",
            "22": "Seinen",
            "23": "Shoujo",
            "24": "Shoujo Ai",
            "25": "Shounen",
            "26": "Shounen Ai",
            "27": "Slice of Life",
            "28": "Sports",
            "29": "Supernatural",
            "30": "Tragedy",
            "31": "Yaoi",
            "32": "Yuri",
            "33": "Biographique",
            "34": "Fantastique"  
        };
    }
    getAlphabetList(){
        return {
            "a": "A",
            "b": "B",
            "c": "C",
            "d": "D",
            "e": "E",
            "f": "F",
            "g": "G",
            "h": "H",
            "i": "I",
            "j": "J",
            "k": "K",
            "l": "L",
            "m": "M",
            "n": "N",
            "o": "O",
            "p": "P",
            "q": "Q",
            "r": "R",
            "s": "S",
            "t": "T",
            "u": "U",
            "v": "V",
            "w": "W",
            "x": "X",
            "y": "Y",
            "z": "Z"  
        };
    }
}

