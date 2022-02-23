'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');


module.exports = class MangaOwl extends Source  {

    constructor() {
        super();
        this.baseUrl = 'https://mangaowls.com';
    }
    getRequestWithHeaders(method, url) {
        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0';
        var hosts = this.baseUrl.replace(/^(https?:|)\/\//, '')
               var options = {
                'method': method,
                'url': url,
                'headers': {
                  'Host': hosts,
                  'User-Agent': userAgent,
                  'Referer': this.baseUrl,
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,image/jpg,image/png,image/webp',
                  'Accept-Language': 'en-us',
                  'Connection': 'keep-alive',
                  'X-Requested-With': 'XMLHttpRequest'
                },
                agentOptions: {
                    ciphers: 'AES256-SHA'
                  }
              };
        return options;
    }
    getDetailsWithHeaders(method, url) {
        var userAgent = '';
        var cookie = '';
        
       if(this.cfheaders != null){
            if(this.cfheaders['User-Agent'] != null){
                userAgent = this.cfheaders['User-Agent'];
            }
            if(this.cfheaders['Cookie'] != null){
                cookie = this.cfheaders['Cookie'];
            }
        }
        console.log(`Site headers are ${JSON.stringify(this.cfheaders)}`)
        var hosts = this.baseUrl.replace(/^(https?:|)\/\//, '')
               var options = {
                'method': method,
                'url': url,
                'headers': {
                  'Host': hosts,
                  'User-Agent': userAgent,
                  'Referer': this.baseUrl,
                  'Cookie': cookie,
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,image/jpg,image/png,image/webp',
                  'Accept-Language': 'en-us',
                  'Connection': 'keep-alive',
                  'X-Requested-With': 'XMLHttpRequest'
                },
                agentOptions: {
                    ciphers: 'AES256-SHA'
                  }
              };
        console.log(`Options are ${JSON.stringify(options)}`)
        return options;
    }
    searchMangaSelector() {
        return 'div.col-md-2';
    }
    
    searchMangaFromElement(element) {
        return this.mangaFromElement(element);
    }
    
    mangaFromElement(element){
        var coverElement = element.find('h6 a').first();
        var url = coverElement.attr('href');
        var name = coverElement.text();
        var thumbnai = element.find('div.img-responsive').attr('data-background-image');
        var thumbnail =  thumbnai + '?'
        var rank = '0';
        return super.manga(name,url,thumbnail,rank);
    }
    
    latestUpdatesRequest(page) {
        return this.getRequestWithHeaders("GET",`${this.baseUrl}/lastest/${page}`);
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
        return this.getRequestWithHeaders("GET",`${this.baseUrl}/popular/${page}`);
    }
    
    popularMangaSelector() {
        return 'div.col-md-2';
    }
    
    popularMangaFromElement(element) {
        return this.mangaFromElement(element);
    }
    
    chapterListSelector() {
        return "div.table-chapter-list ul li:has(a)";
    }
    
    chapterListRequest(seriesURL) {
        if(seriesURL.startsWith('http')){
            return this.getDetailsWithHeaders("GET",seriesURL)
        }
        else {
            return this.getDetailsWithHeaders("GET",super.chapterListRequest(seriesURL))
        }
    }
    
    mangaDetailsRequest(seriesURL) {
        if(seriesURL.startsWith('http')){
            return this.getDetailsWithHeaders("GET",seriesURL)
        }
        else {
            return this.getDetailsWithHeaders("GET",super.mangaDetailsRequest(seriesURL))
        }
    }
    
    chapterListAndMangaDetailsRequest(seriesURL) {
        return this.chapterListRequest(seriesURL);
    }
    async fetchChapterListAndDetails(seriesURL){
        if (this.chapterListRequest(seriesURL) == this.mangaDetailsRequest(seriesURL)) {
            var chapterListAndDetailsResponse = await this.fetchMangaDetails(seriesURL);
            var $ = cheerio.load(chapterListAndDetailsResponse);
            var mangaDetails = this.mangaDetailsParse(chapterListAndDetailsResponse, $, seriesURL);
            var chapters = this.chapterListParse(chapterListAndDetailsResponse, $, seriesURL);
            mangaDetails.chapters = chapters;
            return mangaDetails;
        }
        else {
            var chapterListResponse = await this.fetchChapterList(seriesURL);
            var mangaDetailsResponse = await this.fetchMangaDetails(seriesURL);
            var mangaDetails = this.mangaDetailsParse(mangaDetailsResponse, null, seriesURL);
            var chapters = this.chapterListParse(chapterListResponse, null, seriesURL);
            mangaDetails.chapters = chapters;
            return mangaDetails;
        }
    }
    
    chapterListAndMangaDetailsParse(chapterListAndDetailsResponse,$,seriesURL){
        var mangaDetails = this.mangaDetailsParse(chapterListAndDetailsResponse, $,seriesURL);
        var chapters = this.chapterListParse(chapterListAndDetailsResponse, $,seriesURL);
        mangaDetails.chapters = chapters;
        return mangaDetails;
    }
    chapterFromElement(chapterElement, tr,s){
        var $ = cheerio.load(chapterElement);
        
        var chapterAElement = $('a');
        var url = super.substringAfterFirst("https://r.mangaowls.com", chapterAElement.attr("data-href").replace("/reader/reader/", "/reader/"));
        var name = super.removeLineBreaks($("label",chapterAElement).text()).replace(/^\s+|\s+$/g,'');
        var scanlator = "";
        var date_upload = $('small:last-of-type').text();
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
        
        
        return super.chapter(`${url}?tr=${tr}&s=${s}`, "English", volumeNumber, chapterNumber, name, date_upload, scanlator);
    }
    findTextAndReturnRemainder(target, variable){
        var chopFront = target.substring(target.search(variable)+variable.length,target.length);
        var result = chopFront.substring(0,chopFront.search(";"));
        return result;
    }
    reverseString(str) {
        var string = str
        return string.split('').reverse().join('');
    }
    chapterListParse(response, $, seriesURL){
        console.log("started chapterListParse");
        if($ == null){
            $ = cheerio.load(response);
        }
        console.log("chapterListParse loaded into cheerio");
        var trElment = $(`script`).map((i, x) => x.children[0])
        .filter((i, x) => x && x.data.match(/window\['tr'] = '([^']*)';/)).get(0);
        var trElmen = trElment.data.trim()
        const matchX = this.findTextAndReturnRemainder(trElmen,`window['tr'] = `)
        var tr = matchX.replace(/^\s+|\s+$/g,'').replace(/['"]+/g, '')
        var s = Buffer.from(this.baseUrl).toString('base64')
        var thisReference = this;
        var chapters = [];
        $(this.chapterListSelector()).each(function (i, chapterElement){
            var chapter = thisReference.chapterFromElement(chapterElement,tr,s);
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
        let details = $("div.single_detail")
        let title = $('h2',details).first().text().trim();
        let thumbnai = $('img',details).attr('data-src');
        let author = $("p.fexi_header_para a.author_link",details).first().text().trim();
        let artist = author
        let status = $("p.fexi_header_para:contains('Status')",details).first().text().toUpperCase().trim().replace('STATUS:','');
        var genres = [];
        if (typeof thumbnai === "undefined"){
            thumbnai = $('img',details).attr('src');
        }
        var thumbnail =  thumbnai + '?'
        
        $('div.col-xs-12.col-md-8.single-right-grid-right > p > a[href*=genres]',details).each(function (i, chapterElement){
            var gen = $(chapterElement).text();
            genres.push(gen);
        });
        $('.description span').remove()
        let description = $('.description',details).first().text().trim();
        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }
    pageListSelector() {
        return "div.item img.owl-lazy";
    }
    pageListRequest(chapter) {
        console.log(`Chap Url is ${chapter.chapter}`)
        if(chapter.chapter.startsWith('http')){
            return this.getDetailsWithHeaders("GET",chapter.chapter);
        }
        else {
            return this.getDetailsWithHeaders("GET",super.pageListRequest(chapter));
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
             var url = $(pageElement).attr('data-src');
             var headers = {};
             if (typeof url === "undefined"){
                url = $(pageElement).attr('src');
            }
            headers['Referer'] = thisReference.pageListRequest(chapter);
            headers['Content-Type'] = 'image/jpeg';
            pages.push(thisReference.jsonBrowserifyRequest(url,null,null,headers,null));
        });
        console.log('MangaOwl pages', pages);
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
        console.log("fetchLatestManga -- MangaOwl");
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
            var mangaUpdate = new MangaOwl().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1;
            json.push(mangaUpdate);
        });
        
        console.log("MangaOwl latest -- ", json);
        
        var mangasPage = {};
        mangasPage.mangas = json;
        
        
        var hasNextPage = (json.length >= 36);
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
        
        var hasNextPage = (json.length >= 36);
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
        sourceInfo.url = this.baseUrl + '/single/46730/solo-leveling';
        sourceInfo.isCloudFlareSite = true;
        
        var filters = [];

        var SearchInLS = {};
        SearchInLS.paramKey = 'searchin';
        SearchInLS.displayName = 'Search in';
        SearchInLS.type = 'tag';
        SearchInLS.options = {};
        SearchInLS.options['1'] = 'Manga title';
        SearchInLS.options['2'] = 'Authors';
        SearchInLS.options['3'] = 'Description';
        SearchInLS.default = '1';
        
        var sortFilter = {};
        sortFilter.paramKey = 'sort';
        sortFilter.displayName = 'Sort by';
        sortFilter.type = 'sort';
        sortFilter.options = {};
        sortFilter.options['4'] = 'Matched';
        sortFilter.options['0'] = 'Viewed';
        sortFilter.options['1'] = 'Popularity';
        sortFilter.options['2'] = 'Create Date';
        sortFilter.options['3'] = 'Upload Date';
        sortFilter.default = '4';

        var statusFilter = {};
        statusFilter.paramKey = 'status';
        statusFilter.displayName = 'Status';
        statusFilter.type = 'choice';
        statusFilter.options = {};
        statusFilter.options['2'] = 'Any';
        statusFilter.options['1'] = 'Completed';
        statusFilter.options['0'] = 'Ongoing';
        statusFilter.default = '2';

        var GeneresLISTS = {};
        GeneresLISTS.paramKey = 'genres';
        GeneresLISTS.displayName = 'Generes';
        GeneresLISTS.type = 'tag';
        GeneresLISTS.options = this.getGenresList();

        var MinimumChapFilter = {};
        MinimumChapFilter.paramKey = 'minimumchap';
        MinimumChapFilter.displayName = 'Minimum Chapters';
        MinimumChapFilter.type = 'text';
       
        var MaximumChapFilter = {};
        MaximumChapFilter.paramKey = 'maximumchap';
        MaximumChapFilter.displayName = 'Maximum Chapters';
        MaximumChapFilter.type = 'text'
      
        filters.push(SearchInLS);
        filters.push(sortFilter);
        filters.push(statusFilter);
        filters.push(GeneresLISTS);
        filters.push(MinimumChapFilter)
        filters.push(MaximumChapFilter);

        sourceInfo.filters = filters;
        
        sourceInfo.displayInfo = [];
        
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language",["English"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content",["Manga","Manwha","Manhua","Adult"],["#4D83C1","#4D83C1","#4D83C1","#ff1100"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor",["xOnlyFadi"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("note",["Uses Cloudflare"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker",["No"],[]));

        console.log("MangaOwl sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
        console.log("MangaOwl filters -- ", filters);
        var query = query.replace(/_/g,"%20");
        if (Object.keys(filters).length === 0) {
            console.log("filters are empty");
            var url = `${this.baseUrl}/search/${page}?search=${this.normalizeSearchQuery(query)}&search_field=1&sort=4&completed=2`
            console.log("attempting to fetch search request for MangaOwl - searchUrl is ", url);
            return this.getRequestWithHeaders("GET",url);
        }
        else {
            console.log("filters has properties");
            var query = query.replace(/_/g,"%20");
            var url = `${this.baseUrl}/search/${page}`;
            if (!super.isEmpty(query)){
                url = super.addQueryParameter(url, "search", this.normalizeSearchQuery(query), true);
            } else {
                url = super.addQueryParameter(url, "search", "", true);
            }

            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) {
                  case "searchin":
                        let filtes = filters[i].value
                        let bois = filtes.replace(/,/g,"")
                        url = super.addQueryParameter(url, "search_field", bois, false);
                        break;
                  case "sort":
                        url = super.addQueryParameter(url, "sort", filters[i].value, false);
                        break;
                  case "status":
                        url = super.addQueryParameter(url, "completed", filters[i].value, false);
                        break;
                  case "genres":
                        url = super.addQueryParameter(url, "genres", filters[i].value, false);
                        break;
                  case "minimumchap":
                        url = super.addQueryParameter(url, "chapter_from", filters[i].value, false);
                        break;
                  case "maximumchap":
                        url = super.addQueryParameter(url, "chapter_to", filters[i].value, false);
                        break;
                  default:
                    break;
                }
            }
            console.log("attempting to fetch search request for MangaOwl - searchUrl is ", url);
            return this.getRequestWithHeaders("GET",url);
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
            json.push(new MangaOwl().searchMangaFromElement($(this)));
        });
        
        var page = parseInt(page);
        var mangasPage = {};
        mangasPage.mangas = json;
        mangasPage.hasNextPage = (json.length >= 36);
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
            "89": "4-koma",
            "1": "Action",
            "72": "Adaptation",
            "2": "Adventure",
            "112": "Aliens",
            "122": "All Ages",
            "90": "Animals",
            "101": "Anthology",
            "91": "Award winning",
            "116": "Bara",
            "49": "Cars",
            "15": "Comedy",
            "130": "Comic",
            "63": "Cooking",
            "81": "Crime",
            "105": "Crossdressing",
            "73": "Delinquents",
            "48": "Dementia",
            "3": "Demons",
            "55": "Doujinshi",
            "4": "Drama",
            "27": "Ecchi",
            "92": "Fan colored",
            "7": "Fantasy",
            "82": "Full Color",
            "33": "Game",
            "39": "Gender Bender",
            "97": "Ghosts",
            "107": "Gore",
            "123": "Gossip",
            "104": "Gyaru",
            "38": "Harem",
            "12": "Historical",
            "5": "Horror",
            "98": "Incest",
            "69": "Isekai",
            "129": "Japanese",
            "35": "Josei",
            "42": "Kids",
            "128": "Korean",
            "76": "Long Strip",
            "82": "Mafia",
            "34": "Magic",
            "88": "Magical Girls",
            "127": "Manga",
            "62": "Manhua",
            "61": "Manhwa",
            "37": "Martial Arts",
            "60": "Mature",
            "36": "Mecha",
            "66": "Medical",
            "8": "Military",
            "95": "Monster girls",
            "84": "Monsters",
            "32": "Music",
            "11": "Mystery",
            "93": "Ninja",
            "56": "Novel",
            "121": "NTR",
            "126": "Office",
            "99": "Office Workers",
            "78": "Official colored",
            "67": "One shot",
            "30": "Parody",
            "100": "Philosophical",
            "46": "Police",
            "94": "Post apocalyptic",
            "9": "Psychological",
            "74": "Reincarnation",
            "79": "Reverse harem",
            "25": "Romance",
            "18": "Samurai",
            "59": "School life",
            "70": "Sci-fi",
            "10": "Seinen",
            "117": "Sexual violence",
            "28": "Shoujo",
            "40": "Shoujo Ai",
            "13": "Shounen",
            "44": "Shounen Ai",
            "19": "Slice of Life",
            "65": "Smut",
            "29": "Space",
            "22": "Sports",
            "17": "Super Power",
            "109": "Superhero",
            "6": "Supernatural",
            "85": "Survival",
            "31": "Thriller",
            "80": "Time travel",
            "120": "Toomics",
            "113": "Traditional games",
            "68": "Tragedy",
            "50": "Uncategorized",
            "124": "Uncensored",
            "102": "User created",
            "103": "Vampires",
            "125": "Vanilla",
            "75": "Video games",
            "119": "Villainess",
            "110": "Virtual reality",
            "77": "Web comic",
            "71": "Webtoon",
            "106": "Wuxia",
            "51": "Yaoi",
            "54": "Yuri",
            "108": "Zombies"
        };
    }
}
