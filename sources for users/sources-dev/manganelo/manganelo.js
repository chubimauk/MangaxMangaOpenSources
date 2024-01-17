'use strict';

const Source = require('./source.js');
var rp = require('request-promise');
var cheerio = require('cheerio');
//var cloudscraper = require('cloudscraper'); //for image download to bypass cloudflare

//Manganelo is part of MangaBox
module.exports = class Manganelo extends Source  {

    constructor() {
        super(); //super must be called first otherwise variables are "used before declaration"
        //The manga provider to download the pages from
        this.baseUrl = 'https://m.manganelo.com/';//'https://manganelo.com'; //manganato now..
        
        //unique to Manganelo
        this.latestUrlPath = '/genre-all/';
        
        this.simpleQueryPath = 'search/story/';
        this.baseChapterUrl = 'https://chapmanganelo.com/'; //'https://chapmanganato.com';
    }
    
    searchMangaSelector() {
        return 'div.search-story-item, div.content-genres-item';
    }
    
    searchMangaFromElement(element /*cheerio element --> $(this)*/) {
        return this.mangaFromElement(element);
    }
    
    //unique to Manganelo
    mangaFromElement(element /*cheerio element --> $(this)*/){
        /* MangaBox
         return SManga.create().apply {
            element.select("h3 a").first().let {
                url = it.attr("abs:href").substringAfter(baseUrl) // intentionally not using setUrlWithoutDomain
                title = it.text()
            }
            thumbnail_url = element.select("img").first().attr("abs:src")
        }*/
        
        //https://manganato.com/manga-ls951475
        //https://readmanganato.com/manga-bn978870
        var coverElement = element.find('h3 a').first();
        
        var url = coverElement.attr('href');
        if (!url.includes('https:')){
            url = 'https:' + thumbnail;
        }
        
        var name = coverElement.text();
        var thumbnail = element.find('img').first().attr('src'); //urls include https: already
        
        //extra
        var rank = '0'; //this must be a fucking string
        return super.manga(name,url,thumbnail,rank);
    }
    
    latestUpdatesRequest(page /*Int*/) {
        return this.baseUrl + this.latestUrlPath + `${page}`; //headers?
    }
    
    latestUpdatesSelector() {
        return this.popularMangaSelector();
    }
    
    latestUpdatesFromElement(element /*cheerio element --> $(this)*/) {
        var x = this.mangaFromElement(element);
        console.log("lastestMange -- ",x);
        return x;
    }
    
    popularMangaRequest(page /*Int*/) {
        return this.baseUrl + `/genre-all/${page}?type=topview`; //headers?
    }
    
    popularMangaSelector() {
        return 'div.content-genres-item';
    }
    
    popularMangaFromElement(element /*cheerio element --> $(this)*/) {
        return this.mangaFromElement(element);
    }

    getLastPageNumber(firstPageHtml){ //for popular
        /*<div class="panel-page-number">
        <div class="group-page"><a href="https://manganelo.com/genre-all" class="page-blue">FIRST(1)</a><a href="https://manganelo.com/genre-all">1</a><a class="page-select">2</a><a href="https://manganelo.com/genre-all/3">3</a><a href="https://manganelo.com/genre-all/4">4</a><a href="https://manganelo.com/genre-all/1110" class="page-blue page-last">LAST(1110)</a></div><div class="group-qty"><a class="page-blue">TOTAL : 26,640</a></div> </div>*/
        var $ = cheerio.load(firstPageHtml);
        var lastPageHREFText = $('.page-last').text();
        //console.log("lastPageHREFText --", lastPageHREFText);
        var lastNumbersOnly = lastPageHREFText.match(/\d/g);
        var lastNumber = 0;
        if (lastNumbersOnly != null && lastNumbersOnly.length > 0){ //protect against results with no paging, there won't be a next page if there is only 1 page
            lastNumber = lastNumbersOnly.join('');
        }
        //console.log("lastNumber --", lastNumber);
        return parseInt(lastNumber);
    }
    
    getLastPageNumberForLatest(latestPageHtml){
        return this.getLastPageNumber(latestPageHtml);
    }
    
    getLastPageNumberForSearch(searchPageHtml){
        return this.getLastPageNumber(searchPageHtml);
    }
    
    chapterListSelector() {
        return "div.chapter-list div.row, ul.row-content-chapter li"; //mangaBox
    }
    
    
    
    //overriding source.js
    chapterListRequest(seriesURL) {
        /*MangaBox
         override fun chapterListRequest(manga: SManga): Request {
            if (manga.url.startsWith("http")) {
                return GET(manga.url, headers)
            }
            return super.chapterListRequest(manga)
        }*/
        
        if(seriesURL.startsWith('http')){
            return seriesURL;
        }
        else {
            return super.chapterListRequest(seriesURL);
        }
    }
    
    mangaDetailsRequest(seriesURL) {
        /*MangaBox
         override fun chapterListRequest(manga: SManga): Request {
            if (manga.url.startsWith("http")) {
                return GET(manga.url, headers)
            }
            return super.chapterListRequest(manga)
        }*/
        
        if(seriesURL.startsWith('http')){
            return seriesURL;
        }
        else {
            return super.mangaDetailsRequest(seriesURL);
        }
    }
    
    chapterFromElement(chapterElement, source){
        var $ = cheerio.load(chapterElement);
        
        /*MangaBox
         return SChapter.create().apply {
            element.select("a").let {
                url = it.attr("abs:href").substringAfter(baseUrl) // intentionally not using setUrlWithoutDomain
                name = it.text()
                scanlator = HttpUrl.parse(it.attr("abs:href"))!!.host() // show where chapters are actually from
            }
            date_upload = parseChapterDate(element.select("span").last().text(), element.ownerDocument().location()) ?: 0
        }*/
        
        //console.log("manganelo chapterElement", chapterElement);
        var chapterAElement = $('a');
        var url = super.substringAfterFirst(this.baseChapterUrl, chapterAElement.attr('href'));
        var name = chapterAElement.text();
        var scanlator = ""; //TODO for Manganelo
        var date_upload = $('span').last().text();
        //Vol tbd. chapter 60
        var volumeNumber = '';
        var chapterNumber = '';
        const regex = RegExp(/\b\d+\.?\d?\b/g);
        if (name != null){
            var numbers = name.match(regex);
            //console.log(`title numbers -- , ${numbers}, name -- , ${name}`);
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
                        //have not set the chapter number yet from the first number
                        if(numbers.length > 1){
                            if((name.startsWith('v') || name.startsWith('V'))){
                                //first number is volume
                                volumeNumber = numbers[0];
                                chapterNumber = numbers[1];
                            }
                            else {
                                //probably never happen but, in the case where first number is not after chapter and we don't start with v, just use the first number as chapter
                                chapterNumber = numbers[0];
                                //second number is useless
                            }
                        }
                        else {
                            //if there's only one number, just assume it is the chapter
                            chapterNumber = numbers[0];
                        }
                    }
                    
                    //check if possibly Volume is listed after chapter (very rare e.g. Chapter 108.5: Volume 12 Omake -- Boku No Hero Academia)
                    if(chapterNumber != '' && numbers.length > 1 && volumeNumber == ''){
                        //chapter set, volume not set and we have one more number
                        if (name.includes('volume') || name.includes('Volume')){
                            //fuck it just use the second number as the volume then
                            volumeNumber = numbers[1];
                        }
                    }
                }
                else {
                    chapterNumber = "?"; //no numbers at all
                }
            }
            else {
                chapterNumber = "?";
            }
        } else {
            chapterNumber = "?"; //no name, no chapter
        }
        
        
        return super.chapter(url, "English", volumeNumber, chapterNumber, name, date_upload, scanlator);
    }
    
     chapterListParse(response, $, seriesURL /*not necessary for manganelo but needs to match api*/){ //list of chapter
         console.log("started chapterListParse");
         if($ == null){
             //var $ = cheerio.load(response);
             $ = cheerio.load(response);
         }
         console.log("chapterListParse loaded into cheerio");
        var thisReference = this;
        var chapters = [];
        
         /*MangaBox
         val document = response.asJsoup()
                return document.select(chapterListSelector())
                    .map { chapterFromElement(it) }
                    .also { if (it.isEmpty()) checkForRedirectMessage(document) }
         */
         
         if ($('body').text().startsWith("REDIRECT :")){
             //Source URL has Changed
             return chapters; //empty array
         }
         
         
         $(this.chapterListSelector()).each(function (i, chapterElement){
             var chapter = thisReference.chapterFromElement(chapterElement);
             chapters.push(chapter);
         });
         
         console.log("chapterListParse finished");
        return chapters;
    }
    
    
    mangaDetailsMainSelector(){ //MangaBox
        return 'div.manga-info-top, div.panel-story-info';
    }
    descriptionSelector(){ //MangaBox
        return "div#noidungm, div#panel-story-info-description";
    }
    thumbnailSelector(){
        return "div.manga-info-pic img, span.info-image img";
    }



    mangaDetailsParse(response, $, seriesURL /*not necessary for manganelo but needs to match api*/){ //mangaDetails object
        
        //MangaBox
        // return SManga.create().apply {
        //    document.select(mangaDetailsMainSelector).firstOrNull()?.let { infoElement ->
        //        title = infoElement.select("h1, h2").first().text()
        //        author = infoElement.select("li:contains(author) a, td:containsOwn(author) + td").text()
        //        status = parseStatus(infoElement.select("li:contains(status), td:containsOwn(status) + td").text())
        //        genre = infoElement.select("div.manga-info-top li:contains(genres)").firstOrNull()
        //            ?.select("a")?.joinToString { it.text() } // kakalot
        //            ?: infoElement.select("td:containsOwn(genres) + td a").joinToString { it.text() } // nelo
        //    } ?: checkForRedirectMessage(document)
        //    description = document.select(descriptionSelector)?.firstOrNull()?.ownText()
        //        ?.replace("""^$title summary:\s""".toRegex(), "")
        //        ?.replace("""<\s*br\s*/?>""".toRegex(), "\n")
        //        ?.replace("<[^>]*>".toRegex(), "")
        //    thumbnail_url = document.select(thumbnailSelector).attr("abs:src")
        //}
        
        //from Paper logic
        console.log("started mangaDetailsParse");
        if($ == null){
            //var $ = cheerio.load(response);
            $ = cheerio.load(response);
        }
        console.log("mangaDetailsParse loaded into cheerio");
        let panel = $('.panel-story-info');
        let title = $('.img-loading', panel).attr('title') || '';
        let thumbnail = $('.img-loading', panel).attr('src') || '';
        let table = $('.variations-tableInfo', panel);
        let author = '';
        let artist = '';
        let rating = 0;
        let status = 'ongoing';
        let titles = [title];
        let follows = 0;
        let views = 0;
        let lastUpdate = '';
        let hentai = false;
        
        //let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] })]
        var genres = [];
        
        for (let row of $('tr', table).toArray()) {
          if ($(row).find('.info-alternative').length > 0) {
            let alts = $('h2', table).text().split(/,|;/);
            for (let alt of alts) {
              titles.push(alt.trim());
            }
          }
          else if ($(row).find('.info-author').length > 0) {
            let autart = $('.table-value', row).find('a').toArray()
            author = $(autart[0]).text();
            if (autart.length > 1) {
              artist = $(autart[1]).text();
            }
          }
          else if ($(row).find('.info-status').length > 0) {
            status = $('.table-value', row).text() == 'Ongoing' ? 'ONGOING' : 'COMPLETED';
          }
          else if ($(row).find('.info-genres').length > 0) {
            let elems = $('.table-value', row).find('a').toArray();
            for (let elem of elems) {
              let text = $(elem).text();
              //let id = $(elem).attr('href')?.split('/').pop()?.split('-').pop() || '';
              if (text.toLowerCase().includes('smut')) {
                hentai = true;
              }
              //tagSections[0].tags.push(createTag({ id: id, label: text }))
              genres.push(text);
            }
          }
        }

        table = $('.story-info-right-extent', panel);
        for (let row of $('p', table).toArray()) {
          if ($(row).find('.info-time').length > 0) {
            let time = new Date($('.stre-value', row).text().replace(/(-*(AM)*(PM)*)/g, ''));
            lastUpdate = time.toDateString();
          }
          else if ($(row).find('.info-view').length > 0) {
            views = $('.stre-value', row).text().replace(/,/g, '');
          }
        }

        rating = $('[property=v\\:average]', table).text();
        follows = $('[property=v\\:votes]', table).text();
        let description = $('.panel-story-info-description', panel).text();

        //id, titles, image, raiting, status, artist, author, tags, views, follows, lastUpdate, desc, hentai
        /*manga.push(createManga({
          id: metadata.id,
          titles: titles,
          image: image,
          rating: Number(rating),
          status: status,
          artist: artist,
          author: author,
          tags: tagSections,
          views: views,
          follows: follows,
          lastUpdate: lastUpdate,
          desc: summary,
          hentai: hentai
        }))*/

        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
        
        
        //based on Tachiyomi MangaBox -- author, genre not working
        /*
        var $ = cheerio.load(response);
        var infoElement = $(this.mangaDetailsMainSelector()).first();
        var title = infoElement.find('h1, h2').first().text();
        var author = infoElement.find("li:contains('author') a, td:contains('author') + td").text(); //'li:contains(author) a, td:containsOwn(author) + td'
        var genreElement = infoElement.find("div.manga-info-top li:contains('genres')");
        var genre = '';
        //if(genre == null){
        //    console.log('kakalot genre logic');
            genre = genreElement.find('a').text();//.join(); //kakalot
        //}
        if(genre == null || genre == ''){
            console.log("nelo genre logic");
            genre = genreElement.find('td:contains(genres) + td a').text();//.join(); //nelo //'td:containsOwn(genres) + td a'
        }
        var description = $(this.descriptionSelector()).first().text();
        var thumbnail = $(this.thumbnailSelector()).attr('src');
         */
        
        
        //console.log("mangaDetailsParsed -- ", this.mangaDetails(title, thumbnail, description, author, "artist", "status", genre));
        //return this.mangaDetails(title, thumbnail, description, author, "artist", "status", [genre]);

        //var mangaDetails = super.mangaDetails("title", "thumbnail", "description", "author", "artist", "status", ["genre1"]);
        //return mangaDetails;
        
        //document.select(".cover > img").first().let { coverElement ->
        //    title = coverElement.attr("title")
        //    thumbnail_url = coverElement.attr("abs:src")
        //}

        
        
        //default implementation
        //var mangaDetails = super.mangaDetails("title", "thumbnail", "description", "author", "artist", "status", ["genre1"]);
        //return mangaDetails;
    }
    
    ///Default implementation
    /*async fetchChapterListAndDetails(seriesURL){
        var mangaDetails = super.mangaDetails("title", "thumbnail", "description", "author", "artist", "status", ["genre1"]);
        mangaDetails.chapters = [super.chapter("url", "language", "0", "1", "title", "date_upload", "scanlator")];
        return mangaDetails;
    }*/
    
    //mangaBox
    pageListSelector() {
        return "div#vungdoc img, div.container-chapter-reader img";
    }
    
    /*pageListRequest(chapter: SChapter): Request {
        if (chapter.url.startsWith("http")) {
            return GET(chapter.url, headers)
        }
        return super.pageListRequest(chapter)
    }*/
    //MangaBox
    pageListRequest(chapter) {
        if(chapter.chapter.startsWith('http')){
            return chapter.chapter; //headers?
        }
        else {
            return this.baseChapterUrl + chapter.chapter; //return super.pageListRequest(chapter); <-- uses baseURL
        }
    }
    
    
    /*override fun pageListParse(document: Document): List<Page> {
        return document.select(pageListSelector).mapIndexed { i, element ->
            val url = element.attr("abs:src").let { src ->
                if (src.startsWith("https://convert_image_digi.mgicdn.com")) {
                    "https://images.weserv.nl/?url=" + src.substringAfter("//")
                } else {
                    src
                }
            }
            Page(i, document.location(), url)
        }
    }*/
    
    //override super because we need the chapter
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
             if(url.startsWith("https://convert_image_digi.mgicdn.com")){
                url = "https://images.weserv.nl/?url=" + thisReference.substringAfterFirst("//", url);
             }
             var headers = {};
            headers['Referer'] = thisReference.pageListRequest(chapter);
            headers['Content-Type'] = 'image/jpeg';
            //headers['encoding'] = 'null';
            pages.push(thisReference.jsonBrowserifyRequest(url,null,null,headers,null));
        });
        console.log('manganelo pages', pages);
        return pages;
        
        /*
         ^^THE LOGIC IS CORRECT and gives you the list of image urls, but the downloading IN the app returns this bullshit below
         <!DOCTYPE html>
         <!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
         <!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endif]-->
         <!--[if IE 8]>    <html class="no-js ie8 oldie" lang="en-US"> <![endif]-->
         <!--[if gt IE 8]><!--> <html class="no-js" lang="en-US"> <!--<![endif]-->
         <head>
         <title>Access denied | s3.mkklcdnv3.com used Cloudflare to restrict access</title>
         <meta charset="UTF-8" />
         <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
         <meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1" />
         <meta name="robots" content="noindex, nofollow" />
         <meta name="viewport" content="width=device-width,initial-scale=1" />
         <link rel="stylesheet" id="cf_styles-css" href="/cdn-cgi/styles/cf.errors.css" type="text/css" media="screen,projection" />
         <!--[if lt IE 9]><link rel="stylesheet" id='cf_styles-ie-css' href="/cdn-cgi/styles/cf.errors.ie.css" type="text/css" media="screen,projection" /><![endif]-->
         <style type="text/css">body{margin:0;padding:0}</style>
         <!--[if gte IE 10]><!--><script type="text/javascript" src="/cdn-cgi/scripts/zepto.min.js"></script><!--<![endif]-->
         <!--[if gte IE 10]><!--><script type="text/javascript" src="/cdn-cgi/scripts/cf.common.js"></script><!--<![endif]-->
         </head>
         <body>
         <div id="cf-wrapper">
         <div class="cf-alert cf-alert-error cf-cookie-error" id="cookie-alert" data-translate="enable_cookies">Please enable cookies.</div>
         <div id="cf-error-details" class="cf-error-details-wrapper">
         <div class="cf-wrapper cf-header cf-error-overview">
         <h1>
         <span class="cf-error-type" data-translate="error">Error</span>
         <span class="cf-error-code">1020</span>
         <small class="heading-ray-id">Ray ID: 5952a8630ab1a60d &bull; 2020-05-18 03:58:05 UTC</small>
         </h1>
         <h2 class="cf-subheadline">Access denied</h2>
         </div>
         <section></section>
         <div class="cf-section cf-wrapper">
         <div class="cf-columns two">
         <div class="cf-column">
         <h2 data-translate="what_happened">What happened?</h2>
         <p>This website is using a security service to protect itself from online attacks.</p>
         </div>
         </div>
         </div>
         <div class="cf-error-footer cf-wrapper">
         <p>
         <span class="cf-footer-item">Cloudflare Ray ID: <strong>5952a8630ab1a60d</strong></span>
         <span class="cf-footer-separator">&bull;</span>
         <span class="cf-footer-item"><span>Your IP</span>: 173.239.199.31</span>
         <span class="cf-footer-separator">&bull;</span>
         <span class="cf-footer-item"><span>Performance &amp; security by</span> <a href="https://www.cloudflare.com/5xx-error-landing?utm_source=error_footer" id="brand_link" target="_blank">Cloudflare</a></span>
         </p>
         </div>
         </div>
         </div>
         <script type="text/javascript">
           window._cf_translation = {};
           
           
         </script>
         </body>
         </html>
         */
        
    }
    
    //shouldn't need this anymore..
    async fetchPageImage(page /*JSONBrowserifyRequest*/){
        //page is JSON so that it can be different for every source and pass whatever it needs to
        const options = {
          url: page.url,
          encoding: null,
          resolveWithFullResponse: false, //adding this makes it so that you get back "content-type":"image/jpeg and other stuff, not just the buffer data of the image, //sending false so response is just the image, otherwise I have no idea how to properly decode/encode/save the fucking buffer byte data in ios/swift to an actual image (just opens as a blank)
          headers : {
              'Referer': page['headers']['Referer']
          }
        };
        
        console.log("fetchPageImage options -", options);
        //cloudscraper instead of rp crashes only on real device..
        var image = await rp(options)
        .then(function (response) {
            //console.log('User has %d repos', repos.length);
              //console.log(buffer);
              //response.body = response.body.toString('base64');
              return response;
        })
        .catch(function (err) {
            // API call failed...
               return err;
        });
        
        return image;
    }
    
    
    
    
    /*class Manganelo : MangaBox("Manganelo", "https://manganelo.com", "en") {
        // Nelo's date format is part of the base class
        override fun popularMangaRequest(page: Int): Request = GET("$baseUrl/genre-all/$page?type=topview", headers)
        override fun popularMangaSelector() = "div.content-genres-item"
        override val latestUrlPath = "genre-all/"
        override val simpleQueryPath = "search/story/"
        override fun searchMangaSelector() = "div.search-story-item, div.content-genres-item"
        override fun getAdvancedGenreFilters(): List<AdvGenre> = getGenreFilters()
            .drop(1)
            .map { AdvGenre(it.first, it.second) }
    }*/

    
    //ENDPOINT 3 - PAGINATED LATEST //fetchLatestUpdates in Tachiyomi
    async fetchLatestManga(page /*Int*/){
        console.log("fetchLatestManga -- manganelo");
        var page = parseInt(page);
        
        var currentPageHtml = await this.send_request(this.latestUpdatesRequest(`${page}`));
        //console.log("currentPageHtml -- ", currentPageHtml);
        return this.latestUpdatesParse(page, currentPageHtml);
    }
    
    latestUpdatesParse(page /*Int*/, response /*String -- latestUpdatesResponse -- currentPageHtml */){
        //return this.mangasPage([/*manga*/], /*hasNexPage*/ false, /*nextPage*/ 1, /*# results*/ 0);
        var page = parseInt(page); //protect WKNodeBrowserify
        var latestUpdatesSelector = this.latestUpdatesSelector();
        
        var $ = cheerio.load(response);
        
        //DEFAULT FROM PARSEDHTTPSOURCE.KT
        
        /*override fun latestUpdatesParse(response: Response): MangasPage {
            val document = response.asJsoup()

            val mangas = document.select(latestUpdatesSelector()).map { element ->
                latestUpdatesFromElement(element)
            }

            val hasNextPage = latestUpdatesNextPageSelector()?.let { selector ->
                document.select(selector).first()
            } != null

            return MangasPage(mangas, hasNextPage)
        }*/
        
        //MATCHING JS DEFAULT IMPLEMENTATION
        // THIS WORKS LIKE TACHIYOMI, doesn't retrieve # of updates
        var json = [];
        $(latestUpdatesSelector).each(function (i, elem) {
            var mangaUpdate = new Manganelo().latestUpdatesFromElement($(this));
            mangaUpdate.updates = 1; //always 1 update for manganelo, so can just use default implementation and add this
            json.push(mangaUpdate);
        });
        
        console.log("mangenlo latest -- ", json);
        
        //var lastPageNumber = await this.getLastPageNumber(response); //this should work on every page for this source
        var mangasPage = {};
        mangasPage.mangas = json;
        //mangasPage.hasNextPage = lastPageNumber > page;
        //mangasPage.nextPage = page + 1; //this doesn't matter if hasNextPage is false
        //return mangasPage;
        
        
        
        var lastPageNumber = this.getLastPageNumberForLatest(response); //this should work on every page for this source
        var hasNextPage = lastPageNumber > page;
        var nextPage = page + 1; //this doesn't matter if hasNextPage is false
        
        var results = json.length;
        if (lastPageNumber != null && lastPageNumber > 0){
            results = results * lastPageNumber;
        }
        
        return super.mangasPage(json, hasNextPage, nextPage, results);
    }
    
    fetchSourceInfo() {
        var sourceInfo = {};
        sourceInfo.requiresLogin = false; //will show login to get cookies based on this in app
        sourceInfo.url = this.baseUrl;
        sourceInfo.isCloudFlareSite = false;
        
        var filters = [];
        
        var incAndExcGenreFilter = {};
        incAndExcGenreFilter.paramKey = 'genres';
        incAndExcGenreFilter.includeKey = 'g_i';
        incAndExcGenreFilter.excludeKey = 'g_e';
        incAndExcGenreFilter.displayName = 'Genres Include/Exclude';
        incAndExcGenreFilter.type = 'doubletag'; //inlcude, exclude, unselected states
        incAndExcGenreFilter.options = this.getGenresList();
        
        var sortFilter = {};
        sortFilter.paramKey = 'sort';
        sortFilter.displayName = 'Sort';
        sortFilter.type = 'sort';
        sortFilter.options = {};
        sortFilter.options['latest'] = 'Latest updates';
        sortFilter.options['topview'] = 'Top View';
        sortFilter.options['newest'] = 'New manga';
        sortFilter.options['az'] = 'A-Z';
        
        var statusFilter = {};
        statusFilter.paramKey = 'status';
        statusFilter.displayName = 'Status';
        statusFilter.type = 'choice'; //drop-down single choice
        statusFilter.options = {};
        statusFilter.options['all'] = 'Ongoing and Complete'; //all is irrelevant, end search request doesn't need anything in this scenario
        statusFilter.options['completed'] = 'Completed';
        statusFilter.options['ongoing'] = 'Ongoing';
        
        var keywordFilter = {};
        keywordFilter.paramKey = 'keyword';
        keywordFilter.displayName = 'Search keyword in';
        keywordFilter.type = 'choice'; //drop-down single choice
        keywordFilter.options = {};
        keywordFilter.options['e'] = 'Everything'; //e is irrelevant, end search request doesn't need anything in this scenario
        keywordFilter.options['title'] = 'Title';
        keywordFilter.options['alternative'] = 'Alternative Name';
        keywordFilter.options['author'] = 'Author';
        
        filters.push(incAndExcGenreFilter);
        filters.push(sortFilter);
        filters.push(statusFilter);
        filters.push(keywordFilter);
        
        sourceInfo.filters = filters;
        
        sourceInfo.displayInfo = []; //[JSONSourceDisplayInfoTag]?
        
        //jsonSourceDisplayInfoTag(type /*String - one of "bug", "content", "language", "contributor", "tracker", "note",*/, values /*[String]*/, hexColors /*HEX COLOR CODES [String]?*/)
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language",["English"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content",["Manga"],["#4D83C1"]));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor",["mangaxmanga"],null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker",["No"],[])); //should just be No or Yes
        
        console.log("manganelo sourceInfo -- ", sourceInfo);
        return sourceInfo;
    }
    
    searchMangaRequest(page /*Int*/, query, filters) {
        console.log("manganelo filters -- ", filters);
        var query = query = query.replace("_","_"); //spaces need to be _ for manganelo
        if (Object.keys(filters).length === 0) {
            //check dictionary/object is empty
            console.log("filters are empty");
            //addQueryParameter(url, name, value, isFirstParameter)
            var url = this.baseUrl + '/' + this.simpleQueryPath + this.normalizeSearchQuery(query) + `?page=${page}`; //headers -- TODO
                        
            var options = {};
            
            options = {
                   uri: url,
                   headers: {
                       'Referer' : this.baseUrl
                   }
            };
            
            console.log("attempting to fetch search request for manganelo - searchUrl is ", url);
            return options;
        }
        else {
            console.log("filters has properties");
            var url = this.baseUrl + `/advanced_search?page=${page}`;
            if (!super.isEmpty(query)){
                url = super.addQueryParameter(url, "keyw", this.normalizeSearchQuery(query), false); //search query
            }
            var genreInclude = "";
            var genreExclude = "";
            //getGenresList
            ////////////////////
            for(var i=0; i<filters.length; i++){
                switch(filters[i].key) {
                  case "sort":
                        url = super.addQueryParameter(url, "orby", filters[i].value, false);
                        break;
                  //incAndExcGenreFilter -- for doubletag type filter, paramKey won't be used, only includeKey and excludeKey, values are , separated list
                  case "g_i": //includeKey
                        genreInclude = '_' + filters[i].value.replace(",","_"); //values is comma list --- genreInclude need to be in form _##_##_##
                        break;
                  case "g_e": //excludeKey
                        genreExclude = '_' + filters[i].value.replace(",","_"); //values is comma list --- genreExclude need to be in form _##_##_##
                        break;
                  case "status":
                        url = super.addQueryParameter(url, "sts", filters[i].value, false);
                        break;
                  case "keyword":
                        url = super.addQueryParameter(url, "keyt", filters[i].value, false);
                        break;
                  default:
                    break;
                }
            }
            
            if (!super.isEmpty(genreInclude)){
                url = super.addQueryParameter(url, "g_i", genreInclude, false);
            }
            if (!super.isEmpty(genreExclude)){
                url = super.addQueryParameter(url, "g_e", genreExclude, false);
            }
                        
            var options = {};
            options = {
                   uri: url,
                   headers: {
                       'Referer' : this.baseUrl
                   }
            };
            console.log("attempting to fetch search request for manganelo - searchUrl is ", url);
            return options;
        }
    }
    
    
    /*// TACHIYOMI Based on change_alias JS function from Mangakakalot's website
    @SuppressLint("DefaultLocale")
    open fun normalizeSearchQuery(query: String): String {
        var str = query.toLowerCase()
        str = str.replace("[àáạảãâầấậẩẫăằắặẳẵ]".toRegex(), "a")
        str = str.replace("[èéẹẻẽêềếệểễ]".toRegex(), "e")
        str = str.replace("[ìíịỉĩ]".toRegex(), "i")
        str = str.replace("[òóọỏõôồốộổỗơờớợởỡ]".toRegex(), "o")
        str = str.replace("[ùúụủũưừứựửữ]".toRegex(), "u")
        str = str.replace("[ỳýỵỷỹ]".toRegex(), "y")
        str = str.replace("đ".toRegex(), "d")
        str = str.replace("""!|@|%|\^|\*|\(|\)|\+|=|<|>|\?|/|,|\.|:|;|'| |"|&|#|\[|]|~|-|$|_""".toRegex(), "_")
        str = str.replace("_+_".toRegex(), "_")
        str = str.replace("""^_+|_+$""".toRegex(), "")
        return str
    }*/
    
    
    normalizeSearchQuery(query /*String*/) /*:String*/ {
        var query = query.toLowerCase();
        query = query.replace(/[àáạảãâầấậẩẫăằắặẳẵ]+/g, "a");
        query = query.replace(/[èéẹẻẽêềếệểễ]+/g, "e");
        query = query.replace(/[ìíịỉĩ]+/g, "i");
        query = query.replace(/[òóọỏõôồốộổỗơờớợởỡ]+/g, "o");
        query = query.replace(/[ùúụủũưừứựửữ]+/g, "u");
        query = query.replace(/[ỳýỵỷỹ]+/g, "y");
        query = query.replace(/[đ]+/g, "d");
        query = query.replace(" ","_"); //remove spaces //this is what will be in the URL _ instead of a space -- fixes search with spaces
        //TODO
        //str = str.replace("""!|@|%|\^|\*|\(|\)|\+|=|<|>|\?|/|,|\.|:|;|'| |"|&|#|\[|]|~|-|$|_""".toRegex(), "_")
        //str = str.replace("_+_".toRegex(), "_")
        //str = str.replace("""^_+|_+$""".toRegex(), "")
        
        return query;
        
    }
    
        
    searchMangaParse(page /*Int*/, response /*String -- latestUpdatesResponse -- currentPageHtml */, query, filters){ //query filters needed for mangasee
        var page = parseInt(page); //protect WKNodeBrowserify
        var searchMangaSelector = this.searchMangaSelector();
        var json = [];
        
        var $ = cheerio.load(response);
        $(searchMangaSelector).each(function (i, elem) {
            json.push(new Manganelo().searchMangaFromElement($(this)));
        });
        
        var page = parseInt(page); //important for nextPage = page + 1
        //console.log("finished parse json - ", json);
        var lastPageNumber = this.getLastPageNumberForSearch(response); //this should work on every page for this source
        console.log("lastPageNumber - ",lastPageNumber);
        var mangasPage = {};
        mangasPage.mangas = json;
        mangasPage.hasNextPage = lastPageNumber > page;
        mangasPage.nextPage = page + 1; //this doesn't matter if hasNextPage is false
        console.log("mangasPage -- ", mangasPage);

        var results = json.length;
        if (lastPageNumber != null && lastPageNumber > 0){
            results = results * lastPageNumber;
        }
        //return this.mangasPage(json, hasNextPage, nextPage, results);
        mangasPage.results = results;
        return mangasPage;
        //console.log(searchPageHtml);
    }
    
    getGenresList(){
        return {
            //'all':'ALL', //only for MangaBox -- not manganelo
            '2':'Action',
            '3':'Adult',
            '4':'Adventure',
            '6':'Comedy',
            '7':'Cooking',
            '9':'Doujinshi',
            '10':'Drama',
            '11':'Ecchi',
            '12':'Fantasy',
            '13':'Gender bender',
            '14':'Harem',
            '15':'Historical',
            '16':'Horror',
            '45':'Isekai',
            '17':'Josei',
            '44':'Manhua',
            '43':'Manhwa',
            '19':'Martial arts',
            '20':'Mature',
            '21':'Mecha',
            '22':'Medical',
            '24':'Mystery',
            '25':'One shot',
            '26':'Psychological',
            '27':'Romance',
            '28':'School life',
            '29':'Sci fi',
            '30':'Seinen',
            '31':'Shoujo',
            '32':'Shoujo ai',
            '33':'Shounen',
            '34':'Shounen ai',
            '35':'Slice of life',
            '36':'Smut',
            '37':'Sports',
            '38':'Supernatural',
            '39':'Tragedy',
            '40':'Webtoons',
            '41':'Yaoi',
            '42':'Yuri'
        };
    }
    
    //ENDPOINT 2- GET ALL
     //MANGANELO GET ALL
     //this uses promises to do everything in parallel -> 7 seconds to get all results
    async getAll() {
        console.log(this.popularMangaRequest(1));
        var firstPageHtml = await new Manganelo().send_request(this.popularMangaRequest(1));

        //this.getAllPageNumbers(firstPageHtml);
        var allPageNumbers = this.getAllPageNumbers(firstPageHtml); //[1] --> set to 1 to only get first page
        console.log("allPageNumbers=",allPageNumbers);
        var popularMangaSelector = this.popularMangaSelector();
        var json = [];
        
        /* THIS IS TOO MANY CONCURRENT REQUESTS NEED TO SPLIT THIS SOMEHOW
        const promises = allPageNumbers.map(number => new MangaDex().send_request(this.popularMangaRequest(`${number}`)));
        
        await Promise.all(promises).then((data) => {
            data.forEach(function(currentPageHtml){
                var $ = cheerio.load(currentPageHtml);
                $(popularMangaSelector).each(function (i, elem) {
                    json.push(new MangaDex().popularMangaFromElement($(this)));
                });
            });
                                         
        });
         */
        var current = 1;
        var maxConcurrent = 11; //this batches requests to be a maximum of 11 at a time
        while(current < allPageNumbers[allPageNumbers.length-1]){
            var starting = current;
            var last = current;
            var batchPages = [];
            for (var i = current; i < current + maxConcurrent; i++) {
                if(i > allPageNumbers[allPageNumbers.length-1]){
                    //skip non-existent page
                    //current = i - 1;
                    //break;
                }
                else {
                    batchPages.push(i);
                    last = i;
                }
            }
            current = last + 1;
            console.log("starting batched for ",starting, "-", last);
            
            const promises = batchPages.map(number => new Manganelo().send_request(this.popularMangaRequest(`${number}`)));
            
            /*
            await Promise.all(promises).then((data) => {
                data.forEach(function(currentPageHtml){
                    var $ = cheerio.load(currentPageHtml);
                    $(popularMangaSelector).each(function (i, elem) {
                        json.push(new MangaDex().popularMangaFromElement($(this)));
                    });
                });
                                             
            });*/
            
            // THIS ALSO WORKS
            var batchedResults = await Promise.all(promises);
            batchedResults.forEach(function(currentPageHtml){
                    var $ = cheerio.load(currentPageHtml);
                    $(popularMangaSelector).each(function (i, elem) {
                        json.push(new Manganelo().popularMangaFromElement($(this)));
                    });
                });
             
            console.log("finished loop for batched for ",starting, "-", last);
        }
        
        console.log("done getting all manganelo");
        return json;
    }
    
    getAllPageNumbers(firstPageHtml){
        var lastNumber = this.getLastPageNumber(firstPageHtml);
         
        //[...Array(N+1).keys()].slice(1)
        //var pageNumbers = [...Array(lastNumber+1).keys()].slice(1); //this works
        //console.log("pageNumbers-",pageNumbers);
        console.log("lastNumber is ", lastNumber);
        
        var pageNumbers = [];
        for (var i = 1; i <= lastNumber; i++) { //with lastNumber works locally, but times out on phone (796 pages so... 31802 manga)
          pageNumbers.push(i);
        }
        console.log("pageNumbers-",pageNumbers);
        
        return pageNumbers;
    }

}
