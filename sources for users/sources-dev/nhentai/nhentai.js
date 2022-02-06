'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');

module.exports = class Nhentai extends Source  {

    constructor() {
        super();
        this.baseUrl = 'https://nhentai.net';
    }
    
    searchMangaSelector() {
        return this.popularMangaSelector();
    }
    
    searchMangaFromElement(element) {
        return this.mangaFromElement(element);
    }

    mangaFromElement(element){
        var url = element.find('a').attr('href');
        var name = element.find('a > div').first().text().replace(/{.*?}/g, "").replace(/\[.*?\]/g, "").replace(/<.*?>/g, "").replace(/\(.*?\)/g, "").trim();
        var thumbnail = element.find('.cover img').first().attr('data-src');
        if (typeof thumbnail === "undefined"){
            thumbnai = element.find('.cover img').attr('src');
        }
        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }
    
    latestUpdatesRequest(page) {
        return `${this.baseUrl}/language/english/?page=${page}`;
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
        return `${this.baseUrl}/language/english/popular?page=${page}`;
    }
    
    popularMangaSelector() {
        return '#content .gallery';
    }
    
    popularMangaFromElement(element) {
        return this.mangaFromElement(element);
    }
    getLastPageNumber(firstPageHtml,page){
        var $ = cheerio.load(firstPageHtml);
        var lastPageHREFText = $('#content > section.pagination > a.next').attr("href");
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
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      }
    chapterListParse(response, $, seriesURL){
         console.log("started chapterListParse");
         if($ == null){
             $ = cheerio.load(response);
         }
        console.log("chapterListParse loaded into cheerio");
        var chapters = [];       
        var url = seriesURL
        $("#tags > div:nth-child(6) > span a.tag-17249").remove()
        var language = this.capitalizeFirstLetter($("#tags > div:nth-child(6) > span > a .name").text())
        var volume = ""
        var number = "1"
        var title = ""
        var date_upload = super.substringBeforeLast("T",$('#tags > div:nth-child(9) > span > time').attr('datetime'))
        var scanlator = $("#tags > div:nth-child(5) > span > a .name").text()
        chapters.push({url, language, volume, number, title, date_upload, scanlator})
        console.log("chapterListParse finished");
        return chapters;
    }

    mangaDetailsParse(response, $, seriesURL){
        console.log("started mangaDetailsParse");
        if($ == null){
            $ = cheerio.load(response);
        }
        console.log("mangaDetailsParse loaded into cheerio");
        $('span.before').remove()
        $('span.after').remove()
        var title = $("#info > h1").text().replace("\"", "").trim()
        var thumbnail = $("#cover > a > img").attr("data-src")
        let author = $("#tags > div:nth-child(4) > span > a .name").text()
        let artist = author
        let status = '';
        
        var genres = [];
        
        $('#tags > div:nth-child(3) > span > a .name').each(function (i, chapterElement){
            var gen = $(chapterElement).text();
            genres.push(gen);
        });

        let description = ""

        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }
    
    pageListSelector() {
        return "div.thumbs a > img";
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
             var url = $(pageElement).attr('data-src').replace("t.nh", "i.nh").replace("t.", ".");
             var headers = {};
             if (typeof thumbnai === undefined){
                thumbnai = $(pageElement).attr('src').replace("t.nh", "i.nh").replace("t.", ".");
            }
            headers['Referer'] = thisReference.pageListRequest(chapter);
            headers['Content-Type'] = 'image/jpeg';
            pages.push(thisReference.jsonBrowserifyRequest(url,null,null,headers,null));
        });
        console.log('Nhentai pages', pages);
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
        console.log("fetchLatestManga -- Nhentai");
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
            var mangaUpdate = new Nhentai().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1;
            json.push(mangaUpdate);
        });
        
        console.log("Nhentai latest -- ", json);
        
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
    
    fetchSourceInfo() {
        var sourceInfo = {};
        sourceInfo.requiresLogin = false;
        sourceInfo.url = this.baseUrl;
        sourceInfo.isCloudFlareSite = false;
        
        var filters = [];

        var IgnoreFIl4 = {};
        IgnoreFIl4.paramKey = 'esa';
        IgnoreFIl4.displayName = 'Separate tags with commas (,) and Spaces';
        IgnoreFIl4.type = 'choice';
        IgnoreFIl4.options = {};

        var IgnoreFIl5 = {};
        IgnoreFIl5.paramKey = 'esa';
        IgnoreFIl5.displayName = 'Prepend with dash (-) to exclude';
        IgnoreFIl5.type = 'choice';
        IgnoreFIl5.options = {};

        var TagsFilter = {}; 
        TagsFilter.paramKey = 'tags';
        TagsFilter.displayName = 'Tags';
        TagsFilter.type = 'text';

        var CategoriesFilter = {}; 
        CategoriesFilter.paramKey = 'categories';
        CategoriesFilter.displayName = 'Categories';
        CategoriesFilter.type = 'text';

        var GroupsFilter = {}; 
        GroupsFilter.paramKey = 'groups';
        GroupsFilter.displayName = 'Groups';
        GroupsFilter.type = 'text';

        var ArtistsFilter = {}; 
        ArtistsFilter.paramKey = 'artists';
        ArtistsFilter.displayName = 'Artists';
        ArtistsFilter.type = 'text';

        var ParodiesFilter = {}; 
        ParodiesFilter.paramKey = 'parodies';
        ParodiesFilter.displayName = 'Parodies';
        ParodiesFilter.type = 'text';

        var CharactersFilter = {}; 
        CharactersFilter.paramKey = 'characters';
        CharactersFilter.displayName = 'Characters';
        CharactersFilter.type = 'text';

        var IgnoreFIl11 = {};
        IgnoreFIl11.paramKey = 'esa';
        IgnoreFIl11.displayName = 'For Uploaded and Pages Changed how it works in the app Examples are below';
        IgnoreFIl11.type = 'choice';
        IgnoreFIl11.options = {};

        var IgnoreFIl111 = {};
        IgnoreFIl111.paramKey = 'esa';
        IgnoreFIl111.displayName = 'greater (>) is (ge), lesser (<) is (le), equals (=) is (eq)';
        IgnoreFIl111.type = 'choice';
        IgnoreFIl111.options = {};

        var IgnoreFIl1 = {};
        IgnoreFIl1.paramKey = 'esa';
        IgnoreFIl1.displayName = 'Uploaded vaild units are h, d, w, m, y (NOTE: sometimes they do not work)';
        IgnoreFIl1.type = 'choice';
        IgnoreFIl1.options = {};

        var IgnoreFIl2 = {};
        IgnoreFIl2.paramKey = 'esa';
        IgnoreFIl2.displayName = 'example: (ge20d)';
        IgnoreFIl2.type = 'choice';
        IgnoreFIl2.options = {};

        var UploadedFilter = {}; 
        UploadedFilter.paramKey = 'uploaded';
        UploadedFilter.displayName = 'Uploaded';
        UploadedFilter.type = 'text';

        var IgnoreFIl3 = {};
        IgnoreFIl3.paramKey = 'esa';
        IgnoreFIl3.displayName = 'Filter by pages, for example:(ge20)';
        IgnoreFIl3.type = 'choice';
        IgnoreFIl3.options = {};

        var PagesFilter = {}; 
        PagesFilter.paramKey = 'pages';
        PagesFilter.displayName = 'Pages';
        PagesFilter.type = 'text';

        var sortFilter = {};
        sortFilter.paramKey = 'sort';
        sortFilter.displayName = 'Sort By';
        sortFilter.type = 'sort';
        sortFilter.options = {};
        sortFilter.options['popular'] = 'Popular: All Time';
        sortFilter.options['popular-week'] = 'Popular: Week';
        sortFilter.options['popular-today'] = 'Popular: Today';
        sortFilter.options['date'] = 'Recent';

        filters.push(IgnoreFIl4);
        filters.push(IgnoreFIl5);
        filters.push(TagsFilter);
        filters.push(CategoriesFilter);
        filters.push(GroupsFilter);
        filters.push(ArtistsFilter);
        filters.push(ParodiesFilter);
        filters.push(CharactersFilter);
        filters.push(IgnoreFIl11);
        filters.push(IgnoreFIl111);
        filters.push(IgnoreFIl1);
        filters.push(IgnoreFIl2);
        filters.push(UploadedFilter);
        filters.push(IgnoreFIl3);
        filters.push(PagesFilter);
        filters.push(sortFilter);
        
        sourceInfo.filters = filters;
        
        sourceInfo.displayInfo = [];
        
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language",["English"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content",["Manga","Doujinshi","Adult"],["#ff1100","#ff1100","#ff1100"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor",["xOnlyFadi"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker",["No"],[]));
        console.log("Nhentai sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
        console.log("Nhentai filters -- ", filters);
        var query = query = query.replace(/_/g,"+");
        if (Object.keys(filters).length === 0) {
            var numbers = query.match(/^[0-9]+$/);
            console.log("filters are empty");
            if(numbers){
                console.log("it has numbers")
                url = `${this.baseUrl}/g/${query}`
                return url;
            } else {
                console.log('it dont have numbers')
                var url = `${this.baseUrl}/search/?q=${this.normalizeSearchQuery(query)}&page=${page}`;
                console.log("attempting to fetch search request for Nhentai - searchUrl is ", url);
                return url
            }
        }
        else {
            console.log("filters has properties");
            var query = query = query.replace(/_/g,"+");
            var url = `${this.baseUrl}/search/`;
            if (!super.isEmpty(query)){
                url = super.addQueryParameter(url, "q", this.normalizeSearchQuery(query), true);
            } else {
                url = super.addQueryParameter(url, "q", "", true);
            }

            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) {
                  case "tags":
                        url += encodeURI(`+tags:${this.FiltersSearcQuer(filters[i].value)}`)
                        break;
                  case "categories":
                        url += encodeURI(`+categories:${this.FiltersSearcQuer(filters[i].value)}`)
                        break;                  
                  case "groups":
                        url += encodeURI(`+groups:${this.FiltersSearcQuer(filters[i].value)}`)
                        break;                 
                  case "artists":
                        url += encodeURI(`+artists:${this.FiltersSearcQuer(filters[i].value)}`)
                        break;                  
                  case "parodies":
                        url += encodeURI(`+parodies:${this.FiltersSearcQuer(filters[i].value)}`)
                        break;                 
                  case "characters":
                        url += encodeURI(`+characters:${this.FiltersSearcQuer(filters[i].value)}`)
                        break;                
                  case "uploaded":
                        url += encodeURI(`+uploaded:${this.FiltersSearcQuer(filters[i].value)}`)
                        break;
                  case "pages":
                        url += encodeURI(`+pages:${this.FiltersSearcQuer(filters[i].value)}`)
                        break;
                  case "sort":vm
                        url = super.addQueryParameter(url, "sort", encodeURI(filters[i].value), false);
                        break;
                  default:
                    break;
                }
            }
            url = super.addQueryParameter(url, "page", page, false);
            console.log("attempting to fetch search request for Nhentai - searchUrl is ", url);
            return url;
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
        query = query.replace(/_/g, "+");
        return query;   
    }
    
    FiltersSearcQuer(query) {
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
        query = query.replace(/_/g, "+");
        query = query.replace(/ge/g, ">");
        query = query.replace(/le/g, "<");
        query = query.replace(/eq/g, "=");

        return query;   
    }

    searchMangaParse(page, response, query, filters){
        var page = parseInt(page);
        var searchMangaSelector = this.searchMangaSelector();
        var json = [];
        var $ = cheerio.load(response);
        var numbers = query.match(/^[0-9]+$/);
        if(numbers){
            const status = $('title').text()
            if(status.includes('404')){
            json = []
            } else {
            var url = `/g/${query}`
            $('span.before').remove()
            $('span.after').remove()
            var name = $("#info > h1").text().replace("\"", "").trim()
            var thumbnail = $("#cover > a > img").attr("data-src")
            var rank = '0'
            json.push({name, url, thumbnail,rank})
           }
        } else {
            $(searchMangaSelector).each(function (i, elem) {
                json.push(new Nhentai().searchMangaFromElement($(this)));
            });   
        }
            
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
}
