'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');

module.exports = class AsuraScans extends Source  {

    constructor() {
        super();
        this.baseUrl = 'https://www.asurascans.com';
    }

    getRequestWithHeaders(url) {
        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0';
        
        const options = {
                   url: url,
               headers: {
                   'User-Agent': userAgent
               }
               };
        return options;
    }
    searchMangaSelector() {
        return this.popularMangaSelector();
    }
    
    searchMangaFromElement(element) {
        return this.mangaFromElement(element);
    }
    
    mangaFromElement(element){
        var coverElement = element.find('a').first();
        var url = super.substringAfterFirst('.com', 'https:' + coverElement.attr('href'));
        var name = coverElement.attr('title')
        var thumbnai = element.find('div.limit img').first().attr('src');
        var rank = '0';
        if (typeof thumbnai === "undefined"){
            thumbnai = element.find('div.limit img').attr('data-src');
        }
        if (typeof thumbnai === "undefined"){
            thumbnai = element.find('div.limit img').attr('datacf-src');
        }
        var thumbnail =  thumbnai + '?'
        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }
    
    latestUpdatesRequest(page) {
        return this.getRequestWithHeaders(`${this.baseUrl}/manga/?page=${page}&order=update`)
    }
    
    latestUpdatesSelector() {
        return this.popularMangaSelector();
    }
    
    latestUpdatesFromElement(element) {
        var x = this.mangaFromElement(element);
        console.log("lastestMange -- ",x);
        return x;
    }
    
    popularMangaRequest(page) {
        return this.getRequestWithHeaders(`${this.baseUrl}/manga/?page=${page}&order=popular`)
    }
    
    popularMangaSelector() {
        return 'div.bs';
    }
    
    popularMangaFromElement(element) {
        return this.mangaFromElement(element);
    }

    getLastPageNumber(firstPageHtml,page){
        var $ = cheerio.load(firstPageHtml);
        var lastPageHREFText = $('.hpage a.r').attr('href');
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
        return "div.bxcl ul li, div.cl ul li, ul li:has(div.chbox):has(div.eph-num)";
    }
      
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
        
        var chapterAElement = $('.lchx > a, span.leftoff a, div.eph-num > a');
        var url = super.substringAfterFirst(this.baseUrl, chapterAElement.attr('href'));
        var name = ''
        if (!super.isEmpty($("span.chapternum",chapterAElement))){
            console.log("Not Empty")
            name = $("span.chapternum",chapterAElement).text()
        } else {
            console.log("Empty")
            name = chapterAElement.text().trim();
        }
        var scanlator = "";
        var date_upload = $('span.rightoff, time, span.chapterdate').first().text();

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
        let infoEle = $('div.bigcontent, div.animefull, div.main-info');
        let title = $('div.infox h1',infoEle).text()
        let thumbnai = $('div.thumb img',infoEle).attr('src');
        let author = $('span:contains(Author:), span:contains(Pengarang:), .fmed b:contains(Author)+span, .imptdt:contains(Author) i',infoEle).text().trim();
        let artist = $('.fmed b:contains(Artist)+span, .imptdt:contains(Artist) i',infoEle).text().trim();
        let status = $('span:contains(Status:), .imptdt:contains(Status) i',infoEle).text().toUpperCase().trim();
        var genres = [$('span:contains(Type) a, .imptdt:contains(Type) a, a[href*="type\="], .infotable tr:contains(Type) td:last-child').text()];
        if (typeof thumbnai === "undefined"){
            thumbnai = $('div.thumb img',infoEle).attr('data-src');
        }
        if (typeof thumbnai === "undefined"){
            thumbnai = $('div.thumb img',infoEle).attr('datacf-src');
        }
        var thumbnail =  thumbnai + '?'
        $('span:contains(Genre) a, .mgen a',infoEle).each(function (i, chapterElement){
            var gen = $(chapterElement).text();
            genres.push(gen);
        });
        let description = $('div.desc p, div.entry-content p, div[itemprop="description"]',infoEle).text().trim();
        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }
    
    pageListSelector() {
        return "div#readerarea img";
    }
    
    pageListRequest(chapter) {
        if(chapter.chapter.startsWith('http')){
            return this.getRequestWithHeaders(chapter.chapter);
        }
        else {
            return this.getRequestWithHeaders(super.pageListRequest(chapter));
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
        $('div[class="asurascans.rights"]').remove()
        $(this.pageListSelector()).each(function (i, pageElement){
             var url = $(pageElement).attr('src');
             if (typeof url === "undefined"){
                url = $(pageElement).attr('data-src');
            }
            if (typeof url === "undefined"){
                url = $(pageElement).attr('datacf-src');
            }
            var headers = {};
            headers['Referer'] = thisReference.pageListRequest(chapter);
            headers['Content-Type'] = 'image/jpeg';
            pages.push(thisReference.jsonBrowserifyRequest(url.trim(),null,null,headers,null));
        });
        console.log('AsuraScans pages', pages);
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
        console.log("fetchLatestManga -- AsuraScans");
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
            var mangaUpdate = new AsuraScans().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1;
            json.push(mangaUpdate);
        });
        
        console.log("mangenlo latest -- ", json);
        
        var mangasPage = {};
        mangasPage.mangas = json;
        
        
        var lastPageNumber = this.getLastPageNumber(response,page);
        var hasNextPage = lastPageNumber > page;
        var nextPage = page + 1;
        
        var results = json.length;
        if (lastPageNumber != null && lastPageNumber > 0){
            results = results * lastPageNumber;
        }
        
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
        
        var AuthorFilter = {}; 
        AuthorFilter.paramKey = 'author';
        AuthorFilter.displayName = 'Author';
        AuthorFilter.type = 'text';

        var YearsRelFilter = {}; 
        YearsRelFilter.paramKey = 'release';
        YearsRelFilter.displayName = 'Year';
        YearsRelFilter.type = 'text';

        var sortFilter = {};
        sortFilter.paramKey = 'sort';
        sortFilter.displayName = 'Sort By';
        sortFilter.type = 'sort';
        sortFilter.options = {};
        sortFilter.options[''] = 'Default';
        sortFilter.options['title'] = 'A-Z';
        sortFilter.options['titlereverse'] = 'Z-A';
        sortFilter.options['update'] = 'Latest Update';
        sortFilter.options['latest'] = 'Latest Added';
        sortFilter.options['popular'] = 'Popular';
        sortFilter.default = '';

        var statusFilter = {};
        statusFilter.paramKey = 'status';
        statusFilter.displayName = 'Status';
        statusFilter.type = 'choice';
        statusFilter.options = {};
        statusFilter.options[''] = 'All';
        statusFilter.options['ongoing'] = 'Ongoing';
        statusFilter.options['completed'] = 'Completed';
        statusFilter.options['hiatus'] = 'Hiatus';
        statusFilter.options['dropped'] = 'Dropped';
        statusFilter.options['coming+soon'] = 'Coming Soon';
        statusFilter.default = '';

        var TypeFFilter = {};
        TypeFFilter.paramKey = 'wptype';
        TypeFFilter.displayName = 'Type';
        TypeFFilter.type = 'choice';
        TypeFFilter.options = {};
        TypeFFilter.options[''] = 'Default';
        TypeFFilter.options['manga'] = 'Manga';
        TypeFFilter.options['manhwa'] = 'Manhwa';
        TypeFFilter.options['manhua'] = 'Manhua';
        TypeFFilter.options['comic'] = 'Comic';
        TypeFFilter.default = '';

        var GeneresLISTS = {};
        GeneresLISTS.paramKey = 'genres';
        GeneresLISTS.displayName = 'Genres List';
        GeneresLISTS.type = 'tag';
        GeneresLISTS.options = this.getGenresList();

        filters.push(AuthorFilter);
        filters.push(YearsRelFilter);
        filters.push(sortFilter);
        filters.push(statusFilter);
        filters.push(TypeFFilter);
        filters.push(GeneresLISTS);

        sourceInfo.filters = filters;
        
        console.log("ToonilyCom sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
        console.log("ToonilyCom filters -- ", filters);
        var query = query = query.replace(/_/g,"+");
        if (Object.keys(filters).length === 0) {
            console.log("filters are empty");
            var url = this.getRequestWithHeaders(this.baseUrl + `/manga/?title=` + this.normalizeSearchQuery(query) + `&page=${page}`);
            console.log("attempting to fetch search request for ToonilyCom - searchUrl is ", url);
            return url;
        }
        else {
            console.log("filters has properties");
            var query = query = query.replace(/_/g,"+");
            var url = `${this.baseUrl}/manga/`;
            if (!super.isEmpty(query)){
                url = super.addQueryParameter(url, "title", this.normalizeSearchQuery(query) + `&page=${page}`, true);
            } else {
                url = super.addQueryParameter(url, "title", `&page=${page}`, true);
            }

            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) {
                  case "author":
                        url = super.addQueryParameter(url, "author", filters[i].value, false);
                        break;                 
                  case "release":
                        url = super.addQueryParameter(url, "yearx", filters[i].value, false);
                        break;                  
                  case "status":
                        url = super.addQueryParameter(url, "status", filters[i].value, false);
                        break;
                  case "wptype":
                        url = super.addQueryParameter(url, "type", filters[i].value, false);
                        break;                   
                  case "sort":
                        url = super.addQueryParameter(url, "order", filters[i].value, false);
                        break;                                   
                  case "genres":
                        let filtes = encodeURI(filters[i].value)
                        let bois = filtes.replace(/,/g,"&genre[]=")
                        url = super.addQueryParameter(url, "genre[]", bois, false);
                        break;
                  default:
                    break;
                }
            }
            console.log("attempting to fetch search request for ToonilyCom - searchUrl is ", url);
            return this.getRequestWithHeaders(url);
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
        query = query.replace(/ /g,"+");
        query = query.replace(/%20/g, "+");
        return query;
        
    }
        
    searchMangaParse(page, response, query, filters){
        var page = parseInt(page);
        var searchMangaSelector = this.searchMangaSelector();
        var json = [];
        
        var $ = cheerio.load(response);
        $(searchMangaSelector).each(function (i, elem) {
            json.push(new AsuraScans().searchMangaFromElement($(this)));
        });
        
        var page = parseInt(page);
        var lastPageNumber = this.getLastPageNumber(response,page);
        console.log("lastPageNumber - ",lastPageNumber);
        var mangasPage = {};
        mangasPage.mangas = json;
        mangasPage.hasNextPage = lastPageNumber > page;
        mangasPage.nextPage = page + 1;

        var results = json.length;
        if (lastPageNumber != null && lastPageNumber > 0){
            results = results * lastPageNumber;
        }
        mangasPage.results = results;
        console.log("mangasPage -- ", mangasPage);
        return mangasPage;
    }
    
    getGenresList(){
        return {
            "action": "Action",
            "adaptation": "Adaptation",
            "adult": "Adult",
            "adventure": "Adventure",
            "apocalypse": "apocalypse",
            "comedy": "Comedy",
            "coming-soon": "Coming Soon",
            "cultivation": "Cultivation",
            "demon": "Demon",
            "discord": "Discord",
            "drama": "Drama",
            "dungeons": "Dungeons",
            "ecchi": "Ecchi",
            "fantasy": "Fantasy",
            "game": "Game",
            "genius": "Genius",
            "harem": "Harem",
            "hero": "Hero",
            "historical": "Historical",
            "isekai": "Isekai",
            "josei": "Josei",
            "kool-kids": "Kool Kids",
            "loli": "Loli",
            "magic": "Magic",
            "martial-arts": "Martial Arts",
            "mature": "Mature",
            "mecha": "Mecha",
            "modern-setting": "Modern Setting",
            "monsters": "Monsters",
            "murim": "Murim",
            "mystery": "Mystery",
            "necromancer": "Necromancer",
            "overpowered": "Overpowered",
            "pets": "Pets",
            "post-apocalyptic": "Post-Apocalyptic",
            "psychological": "Psychological",
            "rebirth": "Rebirth",
            "reincarnation": "Reincarnation",
            "return": "Return",
            "returner": "Returner",
            "revenge": "Revenge",
            "romance": "Romance",
            "school-life": "School Life",
            "sci-fi": "Sci-fi",
            "seinen": "Seinen",
            "shoujo": "Shoujo",
            "shounen": "Shounen",
            "slice-of-life": "Slice of Life",
            "super-hero": "Super Hero",
            "superhero": "Superhero",
            "supernatural": "Supernatural",
            "survival": "Survival",
            "system": "System",
            "time-travel": "Time Travel",
            "time-travel-future": "Time Travel (Future)",
            "tragedy": "Tragedy",
            "video-game": "Video Game",
            "video-games": "Video Games",
            "villain": "Villain",
            "virtual-game": "Virtual Game",
            "virtual-reality": "Virtual Reality",
            "virtual-world": "Virtual World",
            "webtoon": "Webtoon",
            "wuxia": "Wuxia"
        };
    }
}
