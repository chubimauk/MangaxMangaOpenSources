'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');

module.exports = class EsNineManga extends Source  {

    constructor() {
        super();
        this.baseUrl = 'https://es.ninemanga.com';
    }
    getRequestWithHeaders(method,url) { // Headers for all nine manga to work
        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; WOW64) Gecko/20100101 Firefox/75';
        
        const options = {
            method:method,
            url: url,
            headers: {
                'User-Agent': userAgent,
                'Accept-Language':'es-ES,es;q=0.9,en;q=0.8,gl;q=0.7'
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
        var coverElement = element.find('a.bookname').first();
        var url = super.substringAfterFirst('.com', 'https:' + coverElement.attr('href'));
        var name = coverElement.text();
        var thumbnail = element.find('img').first().attr('src');
        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }
    
    latestUpdatesRequest(page) {
        return this.getRequestWithHeaders("GET",`${this.baseUrl}/list/New-Update/`);
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
        return this.getRequestWithHeaders("GET",`${this.baseUrl}/category/index_${page}.html`);
    }
    
    popularMangaSelector() {
        return 'dl.bookinfo';
    }
    
    popularMangaFromElement(element) {
        return this.mangaFromElement(element);
    }
    
    chapterListSelector() {
        return "ul.sub_vol_ul > li";
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
    chapterListAndMangaDetailsRequest(seriesURL) {
        return this.chapterListRequest(seriesURL+"?waring=1");
    }
    chapterListAndMangaDetailsParse(chapterListAndDetailsResponse,$,seriesURL){
        console.log("chapterListAndMangaDetailsParse called");
        var mangaDetails = this.mangaDetailsParse(chapterListAndDetailsResponse, $,seriesURL);
        var chapters = this.chapterListParse(chapterListAndDetailsResponse, $,seriesURL);
        mangaDetails.chapters = chapters;
        return mangaDetails;
    }
    chapterFromElement(chapterElement, title){
        var $ = cheerio.load(chapterElement);
        
        var chapterAElement = $('a.chapter_list_a');
        var url = super.substringAfterFirst(this.baseUrl, chapterAElement.attr('href'));
        var name = chapterAElement.text();
        var scanlator = "";
        var date_upload = $('span').last().text();
        var nam = ''
        var reg = ''
        if (name.match(/\bch\b/gi)){
            var n = name.match(/\bch\b(.*)/gi)
            nam = n[0]
            reg = RegExp(/\b\d+\.?\d?\b/g)
        } else if (name.match(/\bcap??tulo\b (\b\d+\.?\d?\b)/gi)){
           var n = name.match(/\bcap??tulo\b(.*)/gi)
           nam = n[0]
           reg = RegExp(/\b\d+\.?\d?\b/g)
        } else if(name.toLowerCase().indexOf(title.toLowerCase()) >= 0){
          nam = super.substringAfterFirst(title, name);
          reg = RegExp(/\b\d+\.?\d?\b/g)
        } else {
           nam = name
           reg = RegExp(/[0-9]{1,2}([,.][0-9]{1,2})|[0-9]+(?!.*[0-9])/g)
        }
        var volumeNumber = '';
        var chapterNumber = '';
        var regex = reg
        if (nam != null){
            console.log("chapterName -- ", nam);
            var numbers = nam.match(regex)
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
        
        
        return super.chapter(url, "Spanish", volumeNumber, chapterNumber, name, date_upload, scanlator);
    }
    
     chapterListParse(response, $, seriesURL){
         console.log("started chapterListParse");
         if($ == null){
             $ = cheerio.load(response);
         }
         console.log("chapterListParse loaded into cheerio");
         var thisReference = this;
         var chapters = []; 
         var info = $("div.bookintro")    
         var title =  $('li > span:not([class])',info).text().trim().replace(/ Manga/g,"")  
         $(this.chapterListSelector()).each(function (i, chapterElement){
             var chapter = thisReference.chapterFromElement(chapterElement,title);
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
        let info = $("div.bookintro")
        let title =  $('li > span:not([class])',info).text().trim().replace(/ Manga/g,"")
        let thumbnail = $('img[itemprop="image"]',info).attr('src');
        let author = $('li a[itemprop="author"]',info).text().trim();
        let artist = author
        let status = $('li a.red',info).first().text().toUpperCase().trim().replace(/EN CURSO/gi,"ONGOING").replace(/COMPLETADO/gi,"COMPLETED");
        var genres = [];
        $('li[itemprop="genre"] a',info).each(function (i, chapterElement){
            var gen = $(chapterElement).text();
            genres.push(gen);
        });
        let description = $('p[itemprop="description"]',info).text().trim().replace(/Resumen:\n/gi,"");
        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }

    pageListRequest(chapter) {
        var singlePageURL = this.baseUrl + chapter.chapter;
        console.log("singlePageURL --", singlePageURL);
        return this.getRequestWithHeaders("GET",singlePageURL);
    }

    async fetchPageList(chapter){
        var pageListResponse = await this.send_request(this.pageListRequest(chapter));
        let firstPageListParse = this.pageListParse(pageListResponse,chapter);
        
        var currentPageListParse = firstPageListParse;
        
        do {
            if (Array.isArray(currentPageListParse)){
                return currentPageListParse;
            }
            else {
                var nextPageListResponse = await this.send_request(currentPageListParse.nextRequest);
                currentPageListParse = this.pageListParse(nextPageListResponse,chapter,currentPageListParse.responseData);
            }
        } while (!Array.isArray(currentPageListParse))
            
        return currentPageListParse;
        
    }
    pageListSelector() {
        return 'div.pic_box img.manga_pic';
    }
    
    pageListParse(pageListResponse, chapter){
        if(arguments.length == 3){
            var chainedResponseData = arguments[2];            
            if (typeof chainedResponseData !== 'object'){
                chainedResponseData = JSON.parse(chainedResponseData) || chainedResponseData || {}; 
            }
            
            let currentPageToParse = arguments[0];
            console.log("chainedResponseData -- ", chainedResponseData);
            var requestsForPagesWithImages = chainedResponseData;
            console.log("EsNineManga chainedResponse -- ", requestsForPagesWithImages);
            var currentPage = parseInt(requestsForPagesWithImages["currentRequestNumber"]);
            var lastRequestNumber = parseInt(requestsForPagesWithImages["lastRequestNumber"]);
            var $ = cheerio.load(pageListResponse);
            var thisReference = this;
            
            var headers = {
                'Accept-Language':'es-ES,es;q=0.9,en;q=0.8,gl;q=0.7'
            }
            
            var pageURL = $('div.pic_box img.manga_pic').attr('src');
            var currentPageBrowserifyRequest = this.jsonBrowserifyRequest(pageURL,null,null,headers,null);
            
            requestsForPagesWithImages[`${currentPage}`] = currentPageBrowserifyRequest;
            
            if (lastRequestNumber > currentPage) {
                var nextPage = currentPage + 1;
                requestsForPagesWithImages["nextRequest"] = requestsForPagesWithImages[`${nextPage}`];
                requestsForPagesWithImages["currentRequestNumber"] = `${nextPage}`;
                return this.jsonChainedResponse(requestsForPagesWithImages, requestsForPagesWithImages["nextRequest"]);
            }
            else {
                var pages = [];
                for(var index = 1; index <= lastRequestNumber; index++) {
                    pages.push(requestsForPagesWithImages[`${index}`]);
                }
                return pages;
            }
        }
        else {
            var $ = cheerio.load(pageListResponse);
            var thisReference = this;
            var requestsForPagesWithImages = {};
            var baseChapterPageURL = "";
            var lastPageNumber = 1;
            $('select#page').find('option').each(function (i, pageElement){
                var pageNumberOrValue = $(pageElement).text();
                var test = thisReference.substringAfterFirst('/', pageNumberOrValue);
                    let currentPageNumber = parseInt(test);
                    if (currentPageNumber > lastPageNumber){
                        lastPageNumber = currentPageNumber;
                }
                if (baseChapterPageURL == ""){
                    baseChapterPageURL = $(pageElement).attr('value');
                    baseChapterPageURL = thisReference.substringBeforeLast('-', baseChapterPageURL);
                    
                }
                console.log("pageNumberOrValue -- ", pageNumberOrValue);
                console.log("baseChapterPageURL --", baseChapterPageURL);
           });
           var headers = {
            'Accept-Language':'es-ES,es;q=0.9,en;q=0.8,gl;q=0.7'
            }
            for(var index = 1; index <= lastPageNumber; index++) {
                let pageURL = `https://es.ninemanga.com${baseChapterPageURL}-${index}.html`;
                requestsForPagesWithImages[`${index}`] = thisReference.jsonBrowserifyRequest(pageURL,null,null,headers,null);
            }
            
            console.log("EsNineManga pageURLs -- ", requestsForPagesWithImages);
            
            requestsForPagesWithImages["nextRequest"] = requestsForPagesWithImages["1"];
            requestsForPagesWithImages["currentRequestNumber"] = "1";
            requestsForPagesWithImages["lastRequestNumber"] = `${lastPageNumber}`;

            return this.jsonChainedResponse(requestsForPagesWithImages, requestsForPagesWithImages["nextRequest"]);
        }
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
        console.log("fetchLatestManga -- EsNineManga");
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
            var mangaUpdate = new EsNineManga().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1;
            json.push(mangaUpdate);
        });
        
        console.log("EsNineManga latest -- ", json);
        
        var mangasPage = {};
        mangasPage.mangas = json;
        
        
        var hasNextPage = 1 > 1;
        var nextPage = 1;
        
        var results = json.length;
        
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
        
        var hasNextPage = (json.length >= 26);
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
        
        var QueryCBEFilter = {};
        QueryCBEFilter.paramKey = 'name_sel';
        QueryCBEFilter.displayName = 'Query';
        QueryCBEFilter.type = 'choice';
        QueryCBEFilter.options = this.ContainBeginEndFilter();
        QueryCBEFilter.default = 'contain';

        var AuthorCBEFilter = {};
        AuthorCBEFilter.paramKey = 'author_sel';
        AuthorCBEFilter.displayName = 'Author';
        AuthorCBEFilter.type = 'choice';
        AuthorCBEFilter.options = this.ContainBeginEndFilter();
        AuthorCBEFilter.default = 'contain';

        var AuthorFilter = {}; 
        AuthorFilter.paramKey = 'author';
        AuthorFilter.displayName = 'Author';
        AuthorFilter.type = 'text';

        var ArtistCBEFilter = {};
        ArtistCBEFilter.paramKey = 'artist_sel';
        ArtistCBEFilter.displayName = 'Artist';
        ArtistCBEFilter.type = 'choice';
        ArtistCBEFilter.options = this.ContainBeginEndFilter();
        ArtistCBEFilter.default = 'contain';

        var ArtistFilter = {}; 
        ArtistFilter.paramKey = 'artist';
        ArtistFilter.displayName = 'Artist';
        ArtistFilter.type = 'text';

        var incAndExcGenreFilter = {};
        incAndExcGenreFilter.paramKey = 'genres';
        incAndExcGenreFilter.includeKey = 'g_i';
        incAndExcGenreFilter.excludeKey = 'g_e';
        incAndExcGenreFilter.displayName = 'Genres Include/Exclude';
        incAndExcGenreFilter.type = 'doubletag';
        incAndExcGenreFilter.options = this.getGenresList();

        var CompletedFilter = {};
        CompletedFilter.paramKey = 'completed_series';
        CompletedFilter.displayName = 'Completed';
        CompletedFilter.type = 'choice';
        CompletedFilter.options = {};
        CompletedFilter.options['either'] = 'Either';
        CompletedFilter.options['yes'] = 'Yes';
        CompletedFilter.options['no'] = 'No';
        CompletedFilter.default = 'either';

        filters.push(QueryCBEFilter);
        filters.push(AuthorCBEFilter);
        filters.push(AuthorFilter);
        filters.push(ArtistCBEFilter);
        filters.push(ArtistFilter);
        filters.push(incAndExcGenreFilter);
        filters.push(CompletedFilter);

        sourceInfo.filters = filters;
        sourceInfo.displayInfo = [];
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language",["Spanish"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content",["Manga","Manhwa","Manhua","Adult"],["#4D83C1","#4D83C1","#4D83C1","#ff1100"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor",["xOnlyFadi"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("note",["Requiere infinitas peticiones de p??ginas","Requires Infinite requests for pages"],["#ff1100","#ff1100"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker",["No"],[])); //should just be No or Yes
        console.log("EsNineManga sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
        console.log("EsNineManga filters -- ", filters);
        var query = query = query.replace(/_/g,"+");
        if (Object.keys(filters).length === 0) {
            console.log("filters are empty");
            var url = this.getRequestWithHeaders("GET",`${this.baseUrl}/search/?wd=${this.normalizeSearchQuery(query)}&page=${page}`);
            console.log("attempting to fetch search request for EsNineManga - searchUrl is ", url);
            return url;
        }
        else {
            console.log("filters has properties");
            var query = query = query.replace(/_/g,"+");
            var url = `${this.baseUrl}/search/`;
            if (!super.isEmpty(query)){
                url = super.addQueryParameter(url, "wd", `${this.normalizeSearchQuery(query)}&page=${page}`, true);
            } else {
                url = super.addQueryParameter(url, "wd", `&page=${page}`, true);
            }

            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) {
                  case "name_sel":
                        url = super.addQueryParameter(url, "name_sel", filters[i].value, false);
                        break;
                  case "author_sel":
                        url = super.addQueryParameter(url, "author_sel", filters[i].value, false);
                        break;                  
                  case "author":
                        url = super.addQueryParameter(url, "author", filters[i].value, false);
                        break;                  
                  case "artist_sel":
                        url = super.addQueryParameter(url, "artist_sel", filters[i].value, false);
                        break;                  
                  case "artist":
                        url = super.addQueryParameter(url, "artist", filters[i].value, false);
                        break;                  
                  case "g_i":
                        url = super.addQueryParameter(url, "category_id", filters[i].value, false);
                        break;                  
                  case "g_e":
                        url = super.addQueryParameter(url, "opout_category_id", filters[i].value, false);
                        break;
                  case "completed_series":
                        url = super.addQueryParameter(url, "completed_series", filters[i].value, false);
                        break;
                  default:
                    break;
                }
            }
            url = super.addQueryParameter(url, "type", `high`, false);
            let finsihedur = this.getRequestWithHeaders("GET",url);

            console.log("attempting to fetch search request for EsNineManga - searchUrl is ", finsihedur);
            return finsihedur;
        }
    }
    
    normalizeSearchQuery(query) {
        var query = query.toLowerCase();
        query = query.replace(/[??????????????????????????????????????????????]+/g, "a");
        query = query.replace(/[??????????????????????????????]+/g, "e");
        query = query.replace(/[????????????]+/g, "i");
        query = query.replace(/[??????????????????????????????????????????????]+/g, "o");
        query = query.replace(/[?????????????????????????????]+/g, "u");
        query = query.replace(/[??????????????]+/g, "y");
        query = query.replace(/[??]+/g, "d");
        query = query.replace(/ /g,"+");
        query = query.replace(/%20/g, "+");
        query = query.replace(/_/g, "+");
        return query;
        
    }
        
    searchMangaParse(page, response, query, filters){
        var page = parseInt(page);
        var searchMangaSelector = this.searchMangaSelector();
        var json = [];
        
        var $ = cheerio.load(response);
        $(searchMangaSelector).each(function (i, elem) {
            json.push(new EsNineManga().searchMangaFromElement($(this)));
        });
        var page = parseInt(page);
        var mangasPage = {};
        mangasPage.mangas = json;
        mangasPage.hasNextPage = (json.length >= 30);
        mangasPage.nextPage = page + 1;

        var results = json.length;
        if (mangasPage.hasNextPage){
            results = results * 1;
        }
        mangasPage.results = results;
        console.log("mangasPage -- ", mangasPage);
        return mangasPage;
    }
    ContainBeginEndFilter(){
        return {
            "contain": "Contain",
            "begin": "Begin",
            "end": "End"
        }
    }
    getGenresList(){
        return {
            "201": "4-Koma",
            "213": "Acci??N",
            "69": "Acci??N",
            "177": "Action",
            "193": "Adult",
            "86": "Adulto",
            "179": "Adventure",
            "229": "Animaci??N",
            "202": "Apocal??Ptico",
            "66": "Artes Marciales",
            "64": "Aventura",
            "120": "Aventuras",
            "223": "BL (Boys Love)",
            "228": "Boys Love",
            "225": "Ciberpunk",
            "93": "Ciencia Ficci??N",
            "75": "Comedia",
            "178": "Comedy",
            "227": "Crimen",
            "199": "Cyberpunk",
            "126": "Demonios",
            "76": "Deporte",
            "111": "Deportes",
            "216": "Doujinshi",
            "79": "Drama",
            "65": "Ecchi",
            "81": "Escolar",
            "249": "Espa??Ol",
            "238": "Extranjero",
            "237": "Familia",
            "100": "Fantacia",
            "214": "Fantas??A",
            "70": "Fantas??A",
            "180": "Fantasy",
            "175": "Gender Bender",
            "230": "G??Nero Bender",
            "226": "Girls Love",
            "222": "GL (Girls Love)",
            "108": "Gore",
            "234": "Guerra",
            "78": "Harem",
            "83": "Hentai",
            "233": "Historia",
            "190": "Historical",
            "95": "Hist??Rico",
            "99": "Horror",
            "240": "Isekai",
            "112": "Josei",
            "72": "Maduro",
            "172": "Magia",
            "248": "Magical Girls",
            "251": "Manga",
            "189": "Martial",
            "181": "Martial Arts",
            "115": "Mecha",
            "247": "Medical",
            "205": "Militar",
            "88": "Misterio",
            "241": "Music",
            "121": "M??Sica",
            "197": "Musical",
            "187": "Mystery",
            "235": "Ni??Os",
            "239": "Oeste",
            "184": "One Shot",
            "221": "One-Shot",
            "195": "Oneshot",
            "198": "Parodia",
            "252": "Philosophical",
            "220": "Polic??Aca",
            "236": "Policiaco",
            "208": "Policial",
            "219": "Psicol??Gica",
            "96": "Psicol??Gico",
            "192": "Psychological",
            "231": "Realidad",
            "196": "Realidad Virtual",
            "169": "Recuentos De La Vida",
            "207": "Reencarnaci??N",
            "67": "Romance",
            "210": "Samurai",
            "176": "School Life",
            "123": "Sci-Fi",
            "73": "Seinen",
            "80": "Shojo",
            "186": "Shojo Ai",
            "218": "Shojo-Ai (Yuri Soft)",
            "77": "Shonen",
            "128": "Shonen Ai",
            "174": "Shonen-Ai",
            "217": "Shonen-Ai (Yaoi Soft)",
            "224": "Shota",
            "85": "Shoujo",
            "194": "Shoujo Ai",
            "173": "Shoujo-Ai",
            "68": "Shounen",
            "185": "Shounen Ai",
            "182": "Slice Of Life",
            "183": "Smut",
            "74": "Sobrenatural",
            "188": "Sports",
            "124": "Super Natural",
            "206": "Super Poderes",
            "246": "Superhero",
            "119": "Supernatural",
            "215": "Superpoderes",
            "203": "Supervivencia",
            "171": "Suspense",
            "242": "Telenovela",
            "204": "Thiller",
            "97": "Thriller",
            "87": "Tragedia",
            "191": "Tragedy",
            "209": "Vampiros",
            "243": "Ver En Lectormanga",
            "84": "Vida Cotidiana",
            "170": "Vida Escolar",
            "122": "Vida Escolar.",
            "92": "Webcomic",
            "200": "Webtoon",
            "244": "Wuxia",
            "105": "Yaoi",
            "211": "Yaoi (Soft)",
            "232": "Yonkoma",
            "127": "Yuri",
            "212": "Yuri (Soft)"
        };
    }
}
