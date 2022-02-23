'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');

module.exports = class Mangahasu extends Source  {

    constructor() {
        super();
        this.baseUrl = 'https://mangahasu.se';
    }
    
    getRequestWithHeaders(method,url) {
        
        var options = {
            'method': method,
            'url': url,
            'headers': {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
              'Referer': 'https://mangahasu.se'
            }
          };
        return options;
    }

    searchMangaSelector() {
        return this.latestUpdatesSelector();
    }
    
    searchMangaFromElement(element) {
        return this.mangaFromElement(element);
    }
    
    mangaFromElement(element){
        var coverElement = element.find('a:has(h3.name-manga), a.name-manga').first();
        var url = super.substringAfterFirst('.se', 'https:' + coverElement.attr('href'));
        var name = coverElement.text().trim();
        var thumbnai = element.find('img').first().attr('src');
        var rank = '0';
        var thumbnail =  `https://cdn.imgproxify.com/image?url=${thumbnai}?&referer=${this.baseUrl}`
        return super.manga(name,url,thumbnail,rank);
    }
    
    latestUpdatesRequest(page) {
        return this.getRequestWithHeaders("GET",`${this.baseUrl}/latest-releases.html?page=${page}`);
    }
    
    latestUpdatesSelector() {
        return "div.div_item";
    }
    
    latestUpdatesFromElement(element) {
        return this.mangaFromElement(element);
    }
    
    popularMangaRequest(page) {
        return this.getRequestWithHeaders("GET",`${this.baseUrl}/most-popular.html?page=${page}`);
    }
    
    popularMangaSelector() {
        return 'div.right div.div_item';
    }
    
    popularMangaFromElement(element) {
        return this.mangaFromElement(element);
    }

    getLastPageNumber(firstPageHtml,page){
        var $ = cheerio.load(firstPageHtml);
        var lastPageHREFText = $('div.pagination-ct a[title="Tiếp"]').attr('href');
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
        return "tbody tr";
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
        var name = chapterAElement.text();
        var scanlator = "";
        var date_upload = $('.date-updated').last().text();

        var volumeNumber = '';
        var chapterNumber = '';
        const regex = RegExp(/[0-9]{1,2}([,.][0-9]{1,2})|[0-9]+(?!.*[0-9])/g)
        if (name != null){
            console.log("chapterName -- ", name);
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
        var infoElement = $('div.info-c')
        let title = $('div.info-title h1').text().trim()
        let thumbnai = $('div.info-img img').attr('src');
        let author = $('b:contains("Author(s):")',infoElement).next().text().trim()
        let artist = $('b:contains("Artist(s):")',infoElement).next().text().trim()
        let status = $('b:contains("Status:")',infoElement).next().text().toUpperCase().trim()
        var genres = $('b:contains("Genre(s):")',infoElement).next().text().replace(/(\s)+/g,"$1").replace(/\t/g,'').trim().split(',')
        if (typeof thumbnai === "undefined"){
            thumbnai = $('div.info-img img').attr('data-src');
        }
        var thumbnail =  `https://cdn.imgproxify.com/image?url=${thumbnai}?&referer=${this.baseUrl}`
        let description = $('div.content-info:has(h3:contains(Summary)) div').first().text().trim();
        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }
    
    pageListSelector() {
        return "div.img img";
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
             var url = $(pageElement).attr('src');
             var headers = {};
             if (typeof url === "undefined"){
                url = $(pageElement).attr('data-src');
            }
            headers['Referer'] = thisReference.pageListRequest(chapter);
            headers['Content-Type'] = 'image/jpeg';
            pages.push(thisReference.jsonBrowserifyRequest(url,null,null,headers,null));
        });
        console.log('Mangahasu pages', pages);
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
        console.log("fetchLatestManga -- Mangahasu");
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
            var mangaUpdate = new Mangahasu().latestUpdatesFromElement($(this));
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
        
        console.log("Mangahasu latest -- ", json);
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

        var ArtistFilter = {}; 
        ArtistFilter.paramKey = 'artist';
        ArtistFilter.displayName = 'Artist';
        ArtistFilter.type = 'text';

        var statusFilter = {};
        statusFilter.paramKey = 'status';
        statusFilter.displayName = 'Status';
        statusFilter.type = 'choice';
        statusFilter.options = {};
        statusFilter.options[''] = 'Any';
        statusFilter.options['1'] = 'Completed';
        statusFilter.options['2'] = 'Ongoing';
        statusFilter.default = '';

        var TypeFilter = {};
        TypeFilter.paramKey = 'typeid';
        TypeFilter.displayName = 'Type';
        TypeFilter.type = 'choice';
        TypeFilter.options = {};
        TypeFilter.options[''] = 'Any';
        TypeFilter.options['10'] = 'Manga';
        TypeFilter.options['12'] = 'Manhwa';
        TypeFilter.options['19'] = 'Manhua';
        TypeFilter.default = '';

        var sortFilter = {};
        sortFilter.paramKey = 'sort';
        sortFilter.displayName = 'Order By';
        sortFilter.type = 'sort';
        sortFilter.options = {};
        sortFilter.options['0'] = 'Recently update';
        sortFilter.options['1'] = 'Oldest update';
        sortFilter.options['2'] = 'Most views';
        sortFilter.options['3'] = 'Fewest views';
        sortFilter.options['4'] = 'Most subscribers';
        sortFilter.options['5'] = 'Fewest subscribers';

        var incAndExcGenreFilter = {};
        incAndExcGenreFilter.paramKey = 'genres';
        incAndExcGenreFilter.includeKey = 'g_i';
        incAndExcGenreFilter.excludeKey = 'g_e';
        incAndExcGenreFilter.displayName = 'Genres Include/Exclude';
        incAndExcGenreFilter.type = 'doubletag';
        incAndExcGenreFilter.options = this.getGenresList();

        filters.push(AuthorFilter);
        filters.push(ArtistFilter);
        filters.push(statusFilter);
        filters.push(TypeFilter);
        filters.push(sortFilter);
        filters.push(incAndExcGenreFilter);

        sourceInfo.filters = filters;
        sourceInfo.displayInfo = [];
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language",["English"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content",["Manga","Manwha","Manhua","Adult"],["#4D83C1","#4D83C1","#4D83C1","#ff1100"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor",["xOnlyFadi"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("note",["Some thumbnails are broken"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker",["No"],[]));
        console.log("Mangahasu sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
        console.log("Mangahasu filters -- ", filters);
        var query = query = query.replace(/_/g,"+");
        if (Object.keys(filters).length === 0) {
            console.log("filters are empty");
            var url = this.getRequestWithHeaders("GET",`${this.baseUrl}/advanced-search.html?keyword=${this.normalizeSearchQuery(query)}&page=${page}`);
            console.log("attempting to fetch search request for Mangahasu - searchUrl is ", url);
            return url;
        }
        else {
            console.log("filters has properties");
            var query = query = query.replace(/_/g,"+");
            var url = `${this.baseUrl}/advanced-search.html`;
            if (!super.isEmpty(query)){
                url = super.addQueryParameter(url, "keyword", `${this.normalizeSearchQuery(query)}&page=${page}`, true);
            } else {
                url = super.addQueryParameter(url, "keyword", `&page=${page}`, true);
            }

            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) {
                  case "author":
                        url = super.addQueryParameter(url, "author", filters[i].value, false);
                        break;
                  case "artist":
                        url = super.addQueryParameter(url, "artist", filters[i].value, false);
                        break;                  
                  case "status":
                        url = super.addQueryParameter(url, "status", filters[i].value, false);
                        break;                  
                  case "typeid":
                        url = super.addQueryParameter(url, "typeid", filters[i].value, false);
                        break;                  
                  case "g_i":
                        let filtes = filters[i].value
                        let bois = filtes.replace(/,/g,"&g_i[]=")
                        url = super.addQueryParameter(url, "g_i[]", bois, false);
                        break;                  
                  case "g_e":
                        let filtess = filters[i].value
                        let boiss = filtess.replace(/,/g,"&g_e[]=")
                        url = super.addQueryParameter(url, "g_e[]", boiss, false);
                        break;                  
                  case "orderby":
                        url = super.addQueryParameter(url, "orderby", filters[i].value, false);
                        break;
                  default:
                    break;
                }
            }
            let finsihedur = this.getRequestWithHeaders("GET",url);

            console.log("attempting to fetch search request for Mangahasu - searchUrl is ", finsihedur);
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
            json.push(new Mangahasu().searchMangaFromElement($(this)));
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
            "46": "4-koma",
            "1": "Action",
            "101": "Adaptation",
            "2": "Adult",
            "3": "Adventure",
            "103": "Aliens",
            "73": "Animals",
            "57": "Anime",
            "99": "Anthology",
            "128": "Artbook",
            "48": "Award Winning",
            "60": "Bara",
            "130": "Beasts",
            "134": "Cartoon",
            "133": "Childhood Friends",
            "4": "Comedy",
            "5": "Comic",
            "6": "Cooking",
            "92": "Crime",
            "86": "Crossdressing",
            "83": "Delinquents",
            "51": "Demons",
            "7": "Doujinshi",
            "8": "Drama",
            "9": "Ecchi",
            "107": "Fan Colored",
            "10": "Fantasy",
            "95": "Full Color",
            "68": "Game",
            "11": "Gender Bender",
            "81": "Genderswap",
            "90": "Ghosts",
            "100": "Gore",
            "97": "Gyaru",
            "12": "Harem",
            "13": "Historical",
            "14": "Horror",
            "84": "Incest",
            "67": "Isekai",
            "15": "Josei",
            "129": "Kids",
            "59": "Live Action",
            "91": "Loli",
            "16": "Lolicon",
            "93": "Long Strip",
            "113": "Mafia",
            "55": "Magic",
            "89": "Magical Girls",
            "64": "Manga Reviews",
            "20": "Martial Arts",
            "22": "Mecha",
            "23": "Medical",
            "62": "Military",
            "87": "Monster Girls",
            "72": "Monsters",
            "24": "Music",
            "25": "Mystery",
            "123": "Netorare/NTR",
            "112": "Ninja",
            "119": "Office",
            "80": "Office Workers",
            "131": "Omegaverse",
            "26": "One shot",
            "114": "Others",
            "110": "Philosophical",
            "105": "Police",
            "76": "Post-Apocalyptic",
            "27": "Psychological",
            "74": "Reincarnation",
            "69": "Reverse harem",
            "28": "Romance",
            "127": "Royal family",
            "108": "Samurai",
            "29": "School Life",
            "30": "Sci-fi",
            "31": "Seinen",
            "104": "Shota",
            "32": "Shotacon",
            "33": "Shoujo",
            "34": "Shoujo Ai",
            "35": "Shounen",
            "36": "Shounen Ai",
            "132": "Showbiz",
            "37": "Slice of Life",
            "122": "SM/BDSM",
            "38": "Smut",
            "39": "Sports",
            "70": "Super power",
            "88": "Superhero",
            "40": "Supernatural",
            "77": "Survival",
            "75": "Thriller",
            "78": "Time Travel",
            "111": "Traditional Games",
            "41": "Tragedy",
            "102": "User Created",
            "58": "Vampire",
            "85": "Video Games",
            "116": "Villainess",
            "120": "Violence",
            "109": "Virtual Reality",
            "94": "Web Comic",
            "42": "Webtoon",
            "121": "Western",
            "71": "Wuxia",
            "135": "Yakuzas",
            "43": "Yaoi",
            "106": "Youkai",
            "44": "Yuri",
            "79": "Zombies"
        };
    }
}
