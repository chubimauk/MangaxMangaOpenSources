'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');


module.exports = class Mangalek extends Source  {

    constructor() {
        super();
        this.baseUrl = 'https://mangalek.com';
        
    }
    getRequestWithHeaders(method,url) {
        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0';
        var hosts = this.baseUrl.replace(/^(https?:|)\/\//, '')
               var options = {
                'method': method,
                'url': url,
                'headers': {
                  'Host': hosts,
                  'User-Agent': userAgent,
                  'Referer': this.baseUrl,
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                  'Accept-Language': 'en-us',
                  'Connection': 'keep-alive',
                  'X-Requested-With': 'XMLHttpRequest',
                }
              };
        return options;
    }
    GetMangaFormDetails(url,popular,page){
        var meta_key = ''
        var sidebar = ''
        if(popular){
          meta_key = '_wp_manga_views'
        }else {
          meta_key = '_latest_update'
        }
        if(popular){
          sidebar = 'full'
        }else {
          sidebar = 'right'
        }
        var hosts = this.baseUrl.replace(/^(https?:|)\/\//, '')
        var pages = page - 1
        var options = {
          'method': 'POST',
          'url': url,
          'headers': {
            'Host': hosts,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0',
            'Referer': this.baseUrl,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          form: {
            'action': 'madara_load_more',
            'page': pages,
            'template': 'madara-core/content/content-archive',
            'vars[orderby]': 'meta_value_num',
            'vars[paged]': '1',
            'vars[posts_per_page]': '20',
            'vars[post_type]': 'wp-manga',
            'vars[post_status]': 'publish',
            'vars[meta_key]': meta_key,
            'vars[order]': 'desc',
            'vars[sidebar]': sidebar,
            'vars[manga_archives_item_layout]': 'big_thumbnail'
          }
        };
        return options
      }
    searchMangaSelector() {
        return 'div.c-tabs-item__content';
    }
    
    searchMangaFromElement(element) {
        return this.mangaFromElement(element);
    }
    
    mangaFromElement(element){
        var coverElement = element.find('h3 a').first();
        var url = super.substringAfterFirst('.com', 'https:' + coverElement.attr('href'));
        var name = coverElement.text();
        var thumbnai = element.find('img').attr('src');
        var rank = '0';
        if (typeof thumbnai === "undefined"){
            thumbnai = element.find('img').attr('data-src');
        }
        var thumbnail =  thumbnai + '?'
        return super.manga(name,url,thumbnail,rank);
    }
    
    latestUpdatesRequest(page) {
        return this.GetMangaFormDetails(`${this.baseUrl}/wp-admin/admin-ajax.php`,false,page); //headers?
    }
    
    latestUpdatesSelector() {
        return this.popularMangaSelector();
    }
    
    latestUpdatesFromElement(element) {
        return this.popularMangaFromElement(element)
    }
    popularMangaRequest(page) {
        return this.GetMangaFormDetails(`${this.baseUrl}/wp-admin/admin-ajax.php`,true,page); //headers?
    }
    
    popularMangaSelector() {
        return 'div.col-6';
    }
    
    popularMangaFromElement(element) {
        console.log(element)
        var coverElement = element.find('h3 a').first();
        var url = super.substringAfterFirst('.com', 'https:' + coverElement.attr('href'));
        var name = coverElement.text();
        var thumbnai = element.find('img').attr('src');
        var rank = '0';
        if (typeof thumbnai === "undefined"){
            thumbnai = element.find('img').attr('data-src');
        }
        var thumbnail =  thumbnai + '?'
        return super.manga(name,url,thumbnail,rank);
    }

    chapterListSelector() {
        return "li.wp-manga-chapter";
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
        var name = chapterAElement.text().trim();
        var scanlator = "";
        var date_upload = $('span').last().text().trim();
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
        return super.chapter(url, "Arabic", volumeNumber, chapterNumber, name, date_upload, scanlator);
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
        let titl = $('div.post-title h1')
        titl.find("span").remove()
        let title = titl.text().trim()
        let thumbnai = $('div.summary_image img').attr('src');
        let author = $('div.author-content').text().trim();
        let artist = $('div.artist-content').text().trim();
        let status = $('div.post-status div.summary-heading:contains("الحالة")').next().text().trim();
        var genres = [];
        if (typeof thumbnai === "undefined"){
            thumbnai = $('div.summary_image img').attr('data-src');
        }
        if(status.includes("مستمرة")){
            status = "ONGOING"
        }else if(status.includes("مكتملة")){
            status = "COMPLETED"
        }else if(status.includes("ألغيت")){
            status = "CANCELED"
        }else if(status.includes("في الانتظار")){
            status = "ON HOLD"
        }
        var thumbnail =  thumbnai + '?'
        $('div.genres-content a').each(function (i, chapterElement){
            var gen = $(chapterElement).text();
            genres.push(gen);
        });
        let description = $('div.description-summary div.summary__content').text().trim();
        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }
    
    pageListSelector() {
        return "div.page-break img";
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
             if (typeof url === "undefined"){
                url = $('div.summary_image img').attr('data-src');
            }
             var headers = {};
            headers['Referer'] = thisReference.pageListRequest(chapter);
            headers['Content-Type'] = 'image/jpeg';
            pages.push(thisReference.jsonBrowserifyRequest(url.trim(),null,null,headers,null));
        });
        console.log('Mangalek pages', pages);
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
        console.log("fetchLatestManga -- Mangalek");
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
            var mangaUpdate = new Mangalek().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1;
            json.push(mangaUpdate);
        });
        
        console.log("Mangalek latest -- ", json);
        
        var mangasPage = {};
        mangasPage.mangas = json;
        
        
        var hasNextPage = (json.length >= 20);
        var nextPage = page + 1;
        
  
        var results = json.length;
        if (hasNextPage){
          results = results * 1;
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
        
        var hasNextPage = (json.length >= 20);
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
        
        var AuthorFilter = {}; 
        AuthorFilter.paramKey = 'author';
        AuthorFilter.displayName = 'Author';
        AuthorFilter.type = 'text';

        var ArtistFilter = {}; 
        ArtistFilter.paramKey = 'artist';
        ArtistFilter.displayName = 'Artist';
        ArtistFilter.type = 'text';

        var YearsRelFilter = {}; 
        YearsRelFilter.paramKey = 'release';
        YearsRelFilter.displayName = 'Year of Released';
        YearsRelFilter.type = 'text';

        var statusFilter = {};
        statusFilter.paramKey = 'status';
        statusFilter.displayName = 'Status';
        statusFilter.type = 'choice';
        statusFilter.options = {};
        statusFilter.options['end'] = 'Completed';
        statusFilter.options['on-going'] = 'OnGoing';
        statusFilter.options['canceled'] = 'Canceled';
        statusFilter.options['on-hold'] = 'On Hold';

        var sortFilter = {};
        sortFilter.paramKey = 'sort';
        sortFilter.displayName = 'Order By';
        sortFilter.type = 'sort';
        sortFilter.options = {};
        sortFilter.options['latest'] = 'Latest';
        sortFilter.options['views'] = 'Most View';
        sortFilter.options['trending'] = 'Treding';
        sortFilter.options['new-manga'] = 'New';
        sortFilter.options['rating'] = 'Rating';
        sortFilter.options['alphabet'] = 'A-Z';

        var AdultconFilter = {};
        AdultconFilter.paramKey = 'adultcon';
        AdultconFilter.displayName = 'Adult Content';
        AdultconFilter.type = 'choice';
        AdultconFilter.options = {};
        AdultconFilter.options[''] = 'All';
        AdultconFilter.options['0'] = 'None';
        AdultconFilter.options['1'] = 'Only';
        AdultconFilter.default = '';

        var GenreConFilter = {};
        GenreConFilter.paramKey = 'gencon';
        GenreConFilter.displayName = 'Genre condition';
        GenreConFilter.type = 'choice';
        GenreConFilter.options = {};
        GenreConFilter.options[''] = 'or';
        GenreConFilter.options['0'] = 'and';
        GenreConFilter.default = '';

        var GeneresLISTS = {};
        GeneresLISTS.paramKey = 'genres';
        GeneresLISTS.displayName = 'Genres List';
        GeneresLISTS.type = 'tag';
        GeneresLISTS.options = this.getGenresList();

        filters.push(AuthorFilter);
        filters.push(ArtistFilter);
        filters.push(YearsRelFilter);
        filters.push(statusFilter);
        filters.push(sortFilter);
        filters.push(AdultconFilter);
        filters.push(GenreConFilter);
        filters.push(GeneresLISTS);

        sourceInfo.filters = filters;
        
        console.log("Mangalek sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page, query, filters) {
        console.log("Mangalek filters -- ", filters);
        var query = query = query.replace(/_/g,"+");
        if (Object.keys(filters).length === 0) {
            console.log("filters are empty");
            var url = this.getRequestWithHeaders("GET",this.baseUrl + `/page/${page}?s=` + this.normalizeSearchQuery(query) + `&post_type=wp-manga`);
            console.log("attempting to fetch search request for Mangalek - searchUrl is ", url);
            return url;
        }
        else {
            console.log("filters has properties");
            var query = query = query.replace(/_/g,"+");
            var url = `${this.baseUrl}/page/${page}`;
            if (!super.isEmpty(query)){
                url = super.addQueryParameter(url, "s", this.normalizeSearchQuery(query) + "&post_type=wp-manga", true);
            } else {
                url = super.addQueryParameter(url, "s", "&post_type=wp-manga", true);
            }

            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) {
                  case "author":
                        url = super.addQueryParameter(url, "author", filters[i].value, false);
                        break;
                  case "artist":
                        url = super.addQueryParameter(url, "artist", filters[i].value, false);
                        break;                  
                  case "release":
                        url = super.addQueryParameter(url, "release", filters[i].value, false);
                        break;                  
                  case "status":
                        url = super.addQueryParameter(url, "status[]", filters[i].value, false);
                        break;                  
                  case "sort":
                        url = super.addQueryParameter(url, "m_orderby", filters[i].value, false);
                        break;                  
                  case "adultcon":
                        url = super.addQueryParameter(url, "adult", filters[i].value, false);
                        break;                  
                  case "gencon":
                        url = super.addQueryParameter(url, "op", filters[i].value, false);
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
            let finsihedur = this.getRequestWithHeaders("GET",url);

            console.log("attempting to fetch search request for Mangalek - searchUrl is ", finsihedur);
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
        query = query.replace(/ /g,"_");
        query = query.replace(/%20/g, "_");
        return query;
        
    }

    searchMangaParse(page, response, query, filters){
        var page = parseInt(page);
        var searchMangaSelector = this.searchMangaSelector();
        var json = [];
        
        var $ = cheerio.load(response);
        $(searchMangaSelector).each(function (i, elem) {
            json.push(new Mangalek().searchMangaFromElement($(this)));
        });
        
        var page = parseInt(page);
        var mangasPage = {};
        mangasPage.mangas = json;
        if (query.length === 0){
            mangasPage.hasNextPage = (json.length >= 10);
        } else {
            mangasPage.hasNextPage = (json.length >= 20);
        }
        mangasPage.nextPage = page + 1;

        var results = json.length;
        if (mangasPage.hasNextPage){
          results = results * 1;
        }
        mangasPage.results = results;
        console.log("mangasPage -- ", mangasPage);
        return mangasPage;
    }
    
    getGenresList(){
        return {
            "%d8%a5%d9%86%d8%aa%d9%82%d8%a7%d9%85": "إنتقام",
            "%d8%a7%d8%ab%d8%a7%d8%b1%d9%87": "اثاره",
            "%d8%a7%d8%b3%d8%a8%d9%88%d8%b9%d9%89": "اسبوعى",
            "%d8%a7%d8%b4%d8%a8%d8%a7%d8%ad": "اشباح",
            "%d8%a7%d8%b9%d8%a7%d8%af%d8%a9-%d8%a7%d8%ad%d9%8a%d8%a7%d8%a1": "اعادة احياء",
            "%d8%a7%d9%83%d8%b4%d9%86": "اكشن",
            "%d8%a7%d9%84%d8%a7%d8%aa": "الات",
            "%d8%a7%d9%84%d8%ad%d9%8a%d8%a7%d8%a9-%d8%a7%d9%84%d9%85%d8%af%d8%b1%d8%b3%d9%8a%d9%87": "الحياة المدرسيه",
            "%d8%a7%d9%84%d8%b3%d9%81%d8%b1-%d8%b9%d8%a8%d8%b1-%d8%a7%d9%84%d8%b2%d9%85%d9%86": "السفر عبر الزمن",
            "%d8%a7%d9%84%d8%b9%d8%a7%d8%a8": "العاب",
            "%d8%a7%d9%84%d8%b9%d8%a7%d8%a8-%d8%a7%d9%84%d9%83%d8%aa%d8%b1%d9%88%d9%86%d9%8a%d8%a9": "العاب الكترونية",
            "%d8%a7%d9%84%d8%b9%d8%a7%d8%a8-%d8%aa%d9%82%d9%84%d9%8a%d8%af%d9%8a%d8%a9": "العاب تقليدية",
            "%d8%a7%d9%84%d8%b9%d8%a7%d8%a8-%d9%81%d9%8a%d8%af%d9%8a%d9%88": "العاب فيديو",
            "%d8%a7%d9%84%d9%81%d8%aa%d8%a7%d8%a9-%d8%a7%d9%84%d9%88%d8%ad%d8%b4": "الفتاة الوحش",
            "%d8%a7%d9%84%d9%86%d8%ac%d8%a7%d8%a9": "النجاة",
            "%d8%a7%d9%84%d9%88%d8%a7%d9%82%d8%b9-%d8%a7%d9%84%d8%a7%d9%81%d8%aa%d8%b1%d8%a7%d8%b6%d9%8a": "الواقع الافتراضي",
            "%d8%a7%d9%84%d9%8a%d8%a7%d8%aa": "اليات",
            "%d8%a7%d9%85%d8%b1%d8%a3%d8%a9-%d8%b4%d8%b1%d9%8a%d8%b1%d8%a9": "امرأة شريرة",
            "%d8%a7%d9%8a%d8%aa%d8%b4%d9%89": "ايتشى",
            "%d8%a7%d9%8a%d8%b3%d9%83%d8%a7%d9%89": "ايسكاى",
            "%d8%a7%d9%8a%d8%b4%d9%89": "ايشى",
            "%d8%a8%d8%a7%d9%84%d8%ba": "بالغ",
            "%d8%a8%d8%b7%d9%84-%d8%ba%d9%8a%d8%b1-%d8%a7%d8%b9%d8%aa%d9%8a%d8%a7%d8%af%d9%89": "بطل غير اعتيادى",
            "%d8%a8%d8%b7%d9%84-%d8%ba%d9%8a%d8%b1-%d8%a7%d8%b9%d8%aa%d9%8a%d8%a7%d8%af%d9%8a": "بطل غير اعتيادي",
            "%d8%a8%d8%b9%d8%af-%d8%a7%d9%84%d9%83%d8%a7%d8%b1%d8%ab%d9%87": "بعد الكارثه",
            "%d8%aa%d8%a7%d8%b1%d9%8a%d8%ae%d9%89": "تاريخى",
            "%d8%aa%d8%ac%d8%b3%d9%8a%d8%af": "تجسيد",
            "detective": "تحري",
            "%d8%aa%d8%b1%d8%a7%d8%ac%d9%8a%d8%af%d9%8a": "تراجيدي",
            "%d8%aa%d9%84%d9%88%d9%8a%d9%86-%d8%b1%d8%b3%d9%85": "تلوين رسم",
            "%d8%aa%d9%84%d9%88%d9%8a%d9%86-%d8%b1%d8%b3%d9%85%d9%8a": "تلوين رسمي",
            "%d8%aa%d9%84%d9%88%d9%8a%d9%86-%d9%87%d9%88%d8%a7%d8%a9": "تلوين هواة",
            "%d8%aa%d9%86%d8%a7%d8%b3%d8%ae": "تناسخ",
            "%d8%aa%d9%86%d8%a7%d9%8a%d8%ae": "تنايخ",
            "%d8%ab%d8%a3%d8%b1": "ثأر",
            "%d8%ac%d8%a7%d9%86%d8%ad%d9%88%d9%86": "جانحون",
            "%d8%ac%d8%b1%d9%8a%d9%85%d8%a9": "جريمة",
            "%d8%ac%d8%b1%d9%8a%d9%85%d9%87": "جريمه",
            "%d8%ac%d9%86%d8%af%d8%b1-%d8%a8%d9%86%d8%af%d8%b1": "جندر بندر",
            "%d8%ac%d9%86%d8%af%d8%b1-%d8%a8%d9%86%d8%af%d8%b1-%d8%ac%d9%86%d8%af%d8%b1-%d8%a8%d9%86%d8%af%d8%b1": "جندر بندر",
            "%d8%ac%d9%88%d8%b3%d9%89": "جوسى",
            "%d8%ac%d9%88%d8%b3%d9%8a%d9%87": "جوسيه",
            "%d8%ad%d8%a7%d8%a6%d8%b2-%d8%b9%d9%84%d9%8a-%d8%ac%d8%a7%d8%a6%d8%b2%d8%a9": "حائز علي جائزة",
            "%d8%ad%d8%af%d9%8a%d8%ab": "حديث",
            "%d8%ad%d8%b1%d8%a8%d9%89": "حربى",
            "%d8%ad%d8%b1%d9%8a%d9%85": "حريم",
            "%d8%ad%d8%b1%d9%8a%d9%85-%d8%b9%d9%83%d8%b3%d9%89": "حريم عكسى",
            "%d8%ad%d9%8a%d8%a7%d8%a9-%d9%85%d8%af%d8%b1%d8%b3%d9%8a%d8%a9": "حياة مدرسية",
            "%d8%ad%d9%8a%d8%a7%d8%a9-%d9%8a%d9%88%d9%85%d9%8a%d8%a9": "حياة يومية",
            "%d8%ad%d9%8a%d9%88%d8%a7%d9%86%d8%a7%d8%aa": "حيوانات",
            "%d8%ae%d8%a7%d8%b1%d9%82-%d9%84%d9%84%d8%b7%d8%a8%d9%8a%d8%b9%d9%87": "خارق للطبيعه",
            "%d8%ae%d9%8a%d8%a7%d9%84": "خيال",
            "%d8%ae%d9%8a%d8%a7%d9%84-%d8%b9%d9%84%d9%85%d9%89": "خيال علمى",
            "%d8%af%d8%a7%d8%ae%d9%84-%d8%a7%d9%84%d9%84%d8%b9%d8%a8%d9%87": "داخل اللعبه",
            "%d8%af%d8%a7%d8%ae%d9%84-%d8%b1%d9%88%d8%a7%d9%8a%d9%87": "داخل روايه",
            "%d8%af%d8%b1%d8%a7%d9%85%d8%a7": "دراما",
            "%d8%af%d9%85%d9%88%d9%89": "دموى",
            "%d8%b1%d8%a7%d8%b4%d8%af": "راشد",
            "%d8%b1%d8%b9%d8%a8": "رعب",
            "%d8%b1%d9%88%d8%a7%d9%8a%d9%87": "روايه",
            "%d8%b1%d9%88%d9%85%d8%a7%d9%86%d8%b3%d9%89": "رومانسى",
            "%d8%b1%d9%8a%d8%a7%d8%b6%d9%87": "رياضه",
            "%d8%b1%d9%8a%d8%a7%d8%b6%d9%89": "رياضى",
            "%d8%b2%d9%85%d9%83%d8%a7%d9%86%d9%89": "زمكانى",
            "%d8%b2%d9%85%d9%86%d9%83%d8%a7%d9%86%d9%8a": "زمنكاني",
            "%d8%b2%d9%88%d9%85%d8%a8%d9%8a": "زومبي",
            "%d8%b3%d8%a7%d9%85%d9%88%d8%b1%d8%a7%d9%8a": "ساموراي",
            "%d8%b3%d8%a7%d9%85%d9%88%d8%b1%d9%8a": "ساموري",
            "%d8%b3%d8%ad%d8%b1": "سحر",
            "%d8%b3%d9%8a%d9%86%d9%8a%d9%86": "سينين",
            "%d8%b4%d8%b1%d8%b7%d8%a9": "شرطة",
            "%d8%b4%d8%b1%d9%8a%d8%ad%d8%a9-%d9%85%d9%86-%d8%a7%d9%84%d8%ad%d9%8a%d8%a7%d8%a9": "شريحة من الحياة",
            "%d8%b4%d8%b1%d9%8a%d8%b1": "شرير",
            "%d8%b4%d9%88%d8%ac%d9%88": "شوجو",
            "%d8%b4%d9%88%d9%86%d9%8a%d9%86": "شونين",
            "%d8%b4%d9%8a%d8%a7%d8%b7%d9%8a%d9%86": "شياطين",
            "%d8%b4%d9%8a%d9%86%d9%8a%d9%86": "شينين",
            "%d8%b5%d9%82%d9%84": "صقل",
            "%d8%b7%d8%a8%d8%ae": "طبخ",
            "%d8%b7%d8%a8%d9%8a": "طبي",
            "%d8%b7%d8%b1%d8%af-%d8%a7%d9%84%d8%a7%d8%b1%d9%88%d8%a7%d8%ad-%d8%a7%d9%84%d8%b4%d8%b1%d9%8a%d8%b1%d9%87": "طرد الارواح الشريره",
            "%d8%b9%d8%a7%d8%a6%d9%84%d9%89": "عائلى",
            "%d8%b9%d8%a7%d9%84%d9%85-%d9%85%d8%ae%d8%aa%d9%84%d9%81": "عالم مختلف",
            "%d8%b9%d8%a7%d9%85%d9%84-%d9%85%d9%83%d8%aa%d8%a8%d9%8a": "عامل مكتبي",
            "%d8%b9%d8%b3%d9%83%d8%b1%d9%8a": "عسكري",
            "%d8%b9%d9%84%d9%85-%d9%86%d9%81%d8%b3": "علم نفس",
            "%d8%b9%d9%84%d9%85%d9%89": "علمى",
            "%d8%b9%d9%86%d9%81": "عنف",
            "%d8%ba%d9%85%d9%88%d8%b6": "غموض",
            "%d9%81%d9%86%d8%aa%d8%a7%d8%b2%d9%8a%d8%a7": "فنتازيا",
            "%d9%81%d9%86%d9%88%d9%86-%d9%82%d8%aa%d8%a7%d9%84%d9%8a%d9%87": "فنون قتاليه",
            "%d9%81%d9%88%d9%82-%d8%a7%d9%84%d8%b7%d8%a8%d9%8a%d8%b9%d9%87": "فوق الطبيعه",
            "%d9%82%d9%88%d8%a9-%d8%ae%d8%a7%d8%b1%d9%82%d8%a9": "قوة خارقة",
            "%d9%83%d8%a7%d8%a6%d9%86%d8%a7%d8%aa-%d9%81%d8%b6%d8%a7%d8%a6%d9%8a%d8%a9": "كائنات فضائية",
            "%d9%83%d9%84-%d8%a7%d9%84%d8%a7%d8%b9%d9%85%d8%a7%d8%b1": "كل الاعمار",
            "%d9%83%d9%88%d9%85%d9%8a%d8%af%d9%89": "كوميدى",
            "comic": "كوميك",
            "%d9%84%d8%b9%d8%a8%d9%87": "لعبه",
            "%d9%85%d8%a7-%d8%a8%d8%b9%d8%af-%d9%86%d9%87%d8%a7%d9%8a%d8%a9-%d8%a7%d9%84%d8%b9%d8%a7%d9%84%d9%85": "ما بعد نهاية العالم",
            "%d9%85%d8%a7%d8%b3%d8%a7%d8%a9": "ماساة",
            "%d9%85%d8%a7%d9%81%d9%8a%d8%a7": "مافيا",
            "%d9%85%d8%a7%d9%86%d8%ac%d8%a7": "مانجا",
            "%d9%85%d8%a7%d9%86%d9%87%d9%88%d8%a7": "مانهوا",
            "manhua": "مانهوا",
            "%d9%85%d8%ac%d9%85%d9%88%d8%b9%d8%a9-%d9%82%d8%b5%d8%b5": "مجموعة قصص",
            "%d9%85%d8%af%d8%b1%d8%b3%d9%87": "مدرسه",
            "%d9%85%d8%b5%d8%a7%d8%b5%d9%89-%d8%a7%d9%84%d8%af%d9%85%d8%a7%d8%a1": "مصاصى الدماء",
            "%d9%85%d8%ba%d8%a7%d9%85%d8%b1%d8%a9": "مغامرة",
            "%d9%85%d9%82%d8%aa%d8%a8%d8%b3%d8%a9": "مقتبسة",
            "%d9%85%d9%82%d8%b7%d8%b9-%d8%b7%d9%88%d9%84%d9%8a": "مقطع طولي",
            "%d9%85%d9%88%d8%b1%d9%8a%d9%85": "موريم",
            "%d9%85%d9%88%d8%b3%d9%8a%d9%82%d9%89": "موسيقى",
            "%d9%86%d8%a7%d8%b1%d9%8a%d8%ae%d9%89": "ناريخى",
            "%d9%86%d8%a7%d8%b6%d8%ac": "ناضج",
            "%d9%86%d8%a8%d8%a7%d9%84%d8%a9": "نبالة",
            "%d9%86%d8%b8%d8%a7%d9%85": "نظام",
            "%d9%86%d9%81%d8%b3%d9%89": "نفسى",
            "%d9%86%d9%8a%d9%86%d8%ac%d8%a7": "نينجا",
            "%d9%87%d9%88%d8%a7%d9%87": "هواه",
            "%d9%88%d8%ad%d9%88%d8%b4": "وحوش",
            "%d9%88%d9%86-%d8%b4%d9%88%d8%aa": "ون شوت",
            "%d9%88%d9%8a%d8%a8-%d8%aa%d9%88%d9%86": "ويب تون"
        };
    }
}
