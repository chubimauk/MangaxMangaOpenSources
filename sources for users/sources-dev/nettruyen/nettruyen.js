'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');

module.exports = class NetTruyen extends Source  {

    constructor() {
        super();
        this.baseUrl = 'http://www.nettruyengo.com';
    }
    getImageSrc(imageObj){
        let image
        if(typeof imageObj.attr('data-src') != 'undefined') {
            image = imageObj.attr('data-src')
        }
        else if (typeof imageObj.attr('data-original') != 'undefined') {
            image = imageObj.attr('data-original')
        }
        else if (typeof imageObj.attr('data-lazy-src') != 'undefined') {
            image = imageObj.attr('data-lazy-src')
        }
        else if (typeof imageObj.attr('srcset') != 'undefined') {
            image = imageObj.attr('srcset').split(' ')[0]
        }
        else {
            image = imageObj.attr('src')
        }
        if (typeof image != 'undefined'){
            return encodeURI(decodeURI(this.decodeHTMLEntity(image.trim())))
        } else {
            return 'https://i.imgur.com/162n5ut.png'
        }
    }
    
    decodeHTMLEntity(str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
            return String.fromCharCode(dec);
        })
    }

    getRequestWithHeaders(url) {
        var userAgent = 'PostmanRuntime/7.29.0';
        const options = {
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': userAgent,
                'Referer': this.baseUrl
            },
            agentOptions: {
                ciphers: 'AES256-SHA'
              }
        };
        console.log(`Options are ${JSON.stringify(options)}`)
        return options;
    }

    searchMangaSelector() {
        return 'div.items div.item';
    }
    
    searchMangaFromElement(element) {
        var coverElement = element.find('h3 a').first();
        var url = super.substringAfterFirst('.com', coverElement.attr('href'));
        var name = coverElement.text();
        var thumbnail = 'http:' + this.getImageSrc(element.find('div.image a img').first());
        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }
    
    latestUpdatesRequest(page) {
        if (page > 1){
            return this.getRequestWithHeaders(`${this.baseUrl}?page=${page}`);  
        } else {
            return this.getRequestWithHeaders(this.baseUrl);
        }
    }
    
    latestUpdatesSelector() {
        return this.popularMangaSelector();
    }
    
    latestUpdatesFromElement(element) {
        return this.popularMangaFromElement(element);
    }
    
    popularMangaRequest(page) {
        if (page > 1){
            return this.getRequestWithHeaders(`${this.baseUrl}/hot?page=${page}`);
        } else {
            return this.getRequestWithHeaders(`${this.baseUrl}/hot`);
        }
    }
    
    popularMangaSelector() {
        return 'div.items div.item';
    }
    
    popularMangaFromElement(element) {
        var coverElement = element.find('h3 a').first();
        var url = super.substringAfterFirst('.com', coverElement.attr('href'));
        var name = coverElement.text();
        var thumbnail = 'http:' + this.getImageSrc(element.find('div.image:first-of-type img').first());
        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }

    NextPageSelector(firstPageHtml){
        var $ = cheerio.load(firstPageHtml);
        var nextPage = $('a.next-page, a[rel=next]');
        if (nextPage.contents().length !== 0) {
            return true;
        } else {
            return false;
        }
    }
    
    chapterListSelector() {
        return "div.list-chapter li.row:not(.heading)";
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
        
        var chapterAElement = $('a');
        var url = super.substringAfterFirst(this.baseUrl, chapterAElement.attr('href'));
        var name = chapterAElement.text();
        var scanlator = "";
        var date_upload = $('div.col-xs-4').last().text();

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
        
        
        return super.chapter(url, "Vietnamese", volumeNumber, chapterNumber, name, date_upload, scanlator);
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
        let info = $("article#item-detail")
        let title = $('h1',info).text().trim()
        let thumbnail = 'http:' + this.getImageSrc($('div.col-image img',info));
        let author = $('li.author p.col-xs-8',info).text().trim();
        let artist = ""
        let status = $('li.status p.col-xs-8',info).text().trim().replace(/Đang tiến hành/gi,"ONGOING").replace(/Hoàn thành/gi,"COMPLETED");
        var genres = [];
        $('li.kind p.col-xs-8 a',info).each(function (i, chapterElement){
            var gen = $(chapterElement).text();
            genres.push(gen);
        });
        let description = $('div.detail-content p',info).text().trim();
        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }
    
    pageListSelector() {
        return "div.reading-detail > div.page-chapter > img";
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
          
        $(this.pageListSelector()).each(function (i, pageElement){
             var url = thisReference.getImageSrc($(pageElement));
             if (url.indexOf('http') === -1) {
                var headers = {};
                headers['Referer'] = thisReference.pageListRequest(chapter)['url'];
                headers['User-Agent'] = 'PostmanRuntime/7.29.0'
                headers['Content-Type'] = 'image/jpeg';
                pages.push(thisReference.jsonBrowserifyRequest('http:' + url,null,null,headers,null));
            } else{
                var headers = {};
                headers['Referer'] = thisReference.pageListRequest(chapter)['url'];
                headers['User-Agent'] = 'PostmanRuntime/7.29.0'
                headers['Content-Type'] = 'image/jpeg';
                pages.push(thisReference.jsonBrowserifyRequest(url,null,null,headers,null));   
            }
        });
        console.log('NetTruyen pages', pages);
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
        console.log("fetchLatestManga -- NetTruyen");
        var page = parseInt(page);
        
        var currentPageHtml = await this.send_request(this.latestUpdatesRequest(`${page}`));
        return this.latestUpdatesParse(page, currentPageHtml);
    }
    
    latestUpdatesParse(page, response){      
        //console.log(response)  
        var $ = cheerio.load(response);
        var json = [];
        $(this.latestUpdatesSelector()).each(function (i, elem) {
            var mangaUpdate = new NetTruyen().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1;
            json.push(mangaUpdate);
        });
        var page = parseInt(page)
        var mangasPage = {};
        mangasPage.mangas = json;
        var hasNextPage = this.NextPageSelector(response);
        var nextPage = page + 1;
        var results = json.length;
        console.log("NetTruyen latest -- ", json);
        return super.mangasPage(json, hasNextPage, nextPage, results);
    }
    
    popularMangaParse(page, response){
        var $ = cheerio.load(response);
        var json = [];
        var thisReference = this;
        $(this.popularMangaSelector()).each(function (i, elem) {
            json.push(thisReference.popularMangaFromElement($(this)));
        });
        var page = parseInt(page)
        var hasNextPage = this.NextPageSelector(response);
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
        
        var StatusFilter = {
            "paramKey": "status",
            "displayName": "Status",
            "type": "choice",
            "default":"",
            "options": {
                "": "Tất cả",
                "1": "Đang tiến hành",
                "2": "Đã hoàn thành",
                "3": "Tạm ngừng",
            },
        };

        var GeneresLISTS = {
            "paramKey": "genres",
            "displayName": "Genre",
            "type": "choice",
            "default":"",
            "options": this.getGenresList(),
        };

        filters.push(StatusFilter);
        filters.push(GeneresLISTS);

        sourceInfo.filters = filters;
        
        sourceInfo.displayInfo = [];
        
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language",["Vietnamese"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content",["Manga","Manhwa","Manhua"],["#4D83C1","#4D83C1","#4D83C1"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor",["xOnlyFadi"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker",["No"],[]));
        console.log("NetTruyen sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
        console.log("NetTruyen filters -- ", filters);
        if (Object.keys(filters).length === 0) {
            console.log("filters are empty");
            var url = `${this.baseUrl}/?s=${this.normalizeSearchQuery(query)}&post_type=comics&page=${page}`;
            console.log("attempting to fetch search request for NetTruyen - searchUrl is ", url);
            return this.getRequestWithHeaders(url);
        }
        else {
            console.log("filters has properties");
            var url = `${this.baseUrl}/tim-truyen`;

            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) { 
                 case "genres":
                        url += filters[i].value
                        break;               
                 case "status":
                        url = super.addQueryParameter(url, "status", filters[i].value, true);
                        break;                  
                  default:
                    break;
                }
            }
            url = super.addQueryParameter(url, "keyword", this.normalizeSearchQuery(query), false);
            url = super.addQueryParameter(url, "page", page, false);
            url = super.addQueryParameter(url, "sort", "0", false);

            console.log("attempting to fetch search request for NetTruyen - searchUrl is ", url);
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
        query = query.replace(/_/g,"+");
        return query;
        
    }
        
    searchMangaParse(page, response, query, filters){
        var json = [];
        var $ = cheerio.load(response);
        $(this.searchMangaSelector()).each(function (i, elem) {
            json.push(new NetTruyen().searchMangaFromElement($(this)));
        });
        var page = parseInt(page)
        var mangasPage = {};
        mangasPage.mangas = json;
        mangasPage.hasNextPage = this.NextPageSelector(response);
        mangasPage.nextPage = page + 1;
        mangasPage.results = json.length;
        console.log("mangasPage -- ", mangasPage);
        return mangasPage;
    }
    
    getGenresList(){
        return {
            "": "Tất cả",
            "action": "Action",
            "adult": "Adult",
            "adventure": "Adventure",
            "anime": "Anime",
            "chuyen-sinh": "Chuyển Sinh",
            "comedy": "Comedy",
            "comic": "Comic",
            "cooking": "Cooking",
            "co-dai": "Cổ Đại",
            "doujinshi": "Doujinshi",
            "drama": "Drama",
            "dam-my": "Đam Mỹ",
            "ecchi": "Ecchi",
            "fantasy": "Fantasy",
            "gender-bender": "Gender Bender",
            "harem": "Harem",
            "historical": "Historical",
            "horror": "Horror",
            "josei": "Josei",
            "live-action": "Live action",
            "manga": "Manga",
            "manhua": "Manhua",
            "manhwa": "Manhwa",
            "martial-arts": "Martial Arts",
            "mature": "Mature",
            "mecha": "Mecha",
            "mystery": "Mystery",
            "ngon-tinh": "Ngôn Tình",
            "one-shot": "One shot",
            "psychological": "Psychological",
            "romance": "Romance",
            "school-life": "School Life",
            "sci-fi": "Sci-fi",
            "seinen": "Seinen",
            "shoujo": "Shoujo",
            "shoujo-ai": "Shoujo Ai",
            "shounen": "Shounen",
            "shounen-ai": "Shounen Ai",
            "slice-of-life": "Slice of Life",
            "smut": "Smut",
            "soft-yaoi": "Soft Yaoi",
            "soft-yuri": "Soft Yuri",
            "sports": "Sports",
            "supernatural": "Supernatural",
            "thieu-nhi": "Thiếu Nhi",
            "tragedy": "Tragedy",
            "trinh-tham": "Trinh Thám",
            "truyen-scan": "Truyện scan",
            "truyen-mau": "Truyện Màu",
            "webtoon": "Webtoon",
            "xuyen-khong": "Xuyên Không"
        };
    }
}
