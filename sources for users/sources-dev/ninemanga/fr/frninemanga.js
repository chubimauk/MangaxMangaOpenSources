'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');

module.exports = class FrNineManga extends Source  {

    constructor() {
        super();
        this.baseUrl = 'https://fr.ninemanga.com';
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
        } else if (name.match(/\bchapitre\b (\b\d+\.?\d?\b)/gi)){
           var n = name.match(/\bchapitre\b(.*)/gi)
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
        let status = $('li a.red',info).first().text().toUpperCase().trim().replace(/En cours/gi,"ONGOING").replace(/Complété/gi,"COMPLETED");
        var genres = [];
        $('li[itemprop="genre"] a',info).each(function (i, chapterElement){
            var gen = $(chapterElement).text();
            genres.push(gen);
        });
        let description = $('p[itemprop="description"]',info).text().trim().replace(/Sinopse:\n/gi,"");
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
            console.log("FrNineManga chainedResponse -- ", requestsForPagesWithImages);
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
                let pageURL = `https://fr.ninemanga.com${baseChapterPageURL}-${index}.html`;
                requestsForPagesWithImages[`${index}`] = thisReference.jsonBrowserifyRequest(pageURL,null,null,headers,null);
            }
            
            console.log("FrNineManga pageURLs -- ", requestsForPagesWithImages);
            
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
        console.log("fetchLatestManga -- FrNineManga");
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
            var mangaUpdate = new FrNineManga().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1;
            json.push(mangaUpdate);
        });
        
        console.log("FrNineManga latest -- ", json);
        
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
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language",["French"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content",["Manga","Manhwa","Manhua","Adult"],["#4D83C1","#4D83C1","#4D83C1","#ff1100"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor",["xOnlyFadi"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("note",["Requiert des demandes infinies de pages","Requires Infinite requests for pages"],["#ff1100","#ff1100"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker",["No"],[])); //should just be No or Yes
        console.log("FrNineManga sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
        console.log("FrNineManga filters -- ", filters);
        var query = query = query.replace(/_/g,"+");
        if (Object.keys(filters).length === 0) {
            console.log("filters are empty");
            var url = this.getRequestWithHeaders("GET",`${this.baseUrl}/search/?wd=${this.normalizeSearchQuery(query)}&page=${page}`);
            console.log("attempting to fetch search request for FrNineManga - searchUrl is ", url);
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

            console.log("attempting to fetch search request for FrNineManga - searchUrl is ", finsihedur);
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
        query = query.replace(/_/g, "+");
        return query;
        
    }
        
    searchMangaParse(page, response, query, filters){
        var page = parseInt(page);
        var searchMangaSelector = this.searchMangaSelector();
        var json = [];
        
        var $ = cheerio.load(response);
        $(searchMangaSelector).each(function (i, elem) {
            json.push(new FrNineManga().searchMangaFromElement($(this)));
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
            "5": "Action",
            "358": "Adaptation",
            "52": "Adulte",
            "27": "Adventure",
            "13": "Amitié",
            "146": "Amour",
            "98": "Anges",
            "357": "Animals",
            "120": "Animaux",
            "366": "Anthology",
            "89": "Apprentissage",
            "24": "Arts Martiaux",
            "84": "Assassinat",
            "92": "Autre Monde",
            "11": "Aventure",
            "169": "Baseball",
            "172": "Campagne",
            "23": "Chasseur",
            "309": "Chasseur De Prime",
            "123": "Club",
            "81": "ComÉDie",
            "14": "Combats",
            "6": "ComéDie",
            "25": "Comedy",
            "322": "Cooking",
            "270": "Cosmos",
            "66": "Crime",
            "53": "Crossdressing",
            "119": "Cyborgs",
            "302": "Danse",
            "222": "DéLinquant",
            "148": "DéLinquants",
            "18": "DéMons",
            "296": "Dieux / DéEsses",
            "304": "Donjon",
            "306": "Doujin",
            "278": "Doujinshi",
            "197": "Dragons",
            "35": "Drama",
            "2": "Drame",
            "112": "Dystopie",
            "47": "Ecchi",
            "164": "éChec",
            "49": "Ecole",
            "237": "Enfer",
            "158": "Erotique",
            "135": "Espace",
            "22": "Esprit",
            "54": "Famille",
            "1": "Fantastique",
            "28": "Fantasy",
            "20": "FantôMes",
            "7": "Fruit",
            "321": "Full Color",
            "316": "Gang",
            "317": "Gangster",
            "97": "Gastronomie",
            "294": "Gay-Lesbien",
            "51": "Gender Bender",
            "171": "Genderswap",
            "332": "Global-Manga",
            "105": "Gore",
            "15": "Guerre",
            "377": "Gyaru",
            "161": "HarcèLement",
            "50": "Harem",
            "154": "Histoire",
            "160": "Histoires Courtes",
            "41": "Historical",
            "76": "Historique",
            "267": "Homosexualité",
            "19": "Horreur",
            "63": "Horror",
            "79": "Humour",
            "191": "Idols",
            "376": "Incest",
            "342": "Inceste",
            "36": "Isekai",
            "70": "Jeu",
            "232": "Jeunesse",
            "147": "Jeux VidéO",
            "94": "Josei",
            "244": "Loli",
            "352": "Long Strip",
            "126": "LycéE",
            "142": "Mafia",
            "360": "Magic",
            "286": "Magical Girls",
            "8": "Magie",
            "340": "Maladie",
            "323": "Manhua",
            "330": "Mariage",
            "355": "Martial Arts",
            "82": "Mature",
            "68": "Mecha",
            "153": "Mechas",
            "137": "MéDecine",
            "65": "Medical",
            "115": "Militaire",
            "344": "Mondes Virtuels",
            "356": "Monsters",
            "77": "Monstres",
            "375": "Music",
            "151": "Musique",
            "85": "MystÈRe",
            "3": "MystèRe",
            "40": "Mystery",
            "227": "Nature",
            "369": "Ninja",
            "242": "Nostalgie",
            "33": "Nourriture",
            "362": "Official Colored",
            "173": "One Shot",
            "299": "Oneshot",
            "190": "Otaku",
            "131": "Paranormal",
            "96": "Parodie",
            "64": "Philosophical",
            "9": "Pirates",
            "307": "Plaisir",
            "236": "Police",
            "150": "Policier",
            "91": "Politique",
            "234": "Post-Apocalypse",
            "364": "Post-Apocalyptic",
            "113": "Post-Apocalyptique",
            "10": "Pouvoirs",
            "61": "Psychological",
            "74": "Psychologie",
            "42": "Psychologique",
            "93": "Quotidien",
            "107": "RéIncarnation",
            "343": "Reine",
            "315": "Reverse Harem",
            "149": "RêVes",
            "233": "Robots",
            "12": "Roi",
            "26": "Romance",
            "55": "Sadique",
            "155": "Samurai",
            "43": "School Life",
            "44": "Sci-Fi",
            "31": "Science-Fiction",
            "88": "Seinen",
            "331": "Serviteur",
            "165": "Shogi",
            "101": "Shojo",
            "87": "Shojo Ai",
            "80": "Shonen",
            "240": "Shonen Ai",
            "370": "Shota",
            "45": "Shoujo Ai",
            "39": "Shounen Ai",
            "29": "Slice Of Life",
            "56": "Smut",
            "69": "Social",
            "118": "SociéTé",
            "102": "Sport",
            "67": "Sports",
            "238": "Suicide",
            "16": "Super Pouvoirs",
            "62": "Superhero",
            "354": "Supernatural",
            "4": "Surnaturel",
            "213": "Survivre",
            "75": "Suspense",
            "347": "Technologies",
            "183": "Tennis",
            "128": "Thriller",
            "301": "Time Travel",
            "30": "Tournois",
            "73": "TragéDie",
            "37": "Tragedy",
            "111": "Tragique",
            "48": "Tranche De Vie",
            "192": "Travestissement",
            "100": "Vampires",
            "83": "Vengeance",
            "281": "Video Games",
            "86": "Vie Scolaire",
            "335": "Villainess",
            "17": "Voyage",
            "108": "Voyage Temporel",
            "353": "Web Comic",
            "303": "Webcomic",
            "32": "Webtoon",
            "46": "Wuxia",
            "95": "Yakuza",
            "38": "Yaoi",
            "241": "Yokai",
            "159": "Yonkoma",
            "60": "Yuri",
            "277": "Zombies"
        };
    }
}
