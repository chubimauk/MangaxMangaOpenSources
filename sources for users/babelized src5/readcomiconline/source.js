'use strict';

var rp = require('request-promise');

var cheerio = require('cheerio');

module.exports = class Source {
  constructor() {
    //The manga provider to download the pages from
    this.baseUrl = 'https://source.com';
    this.cookie = '';
    this.cfheaders = null;
    this.authinfo = null;
    this.username = null;
    this.client = null;
  } //ENDPOINT FACING METHODS: REQUIRED FUNCTIONS FOR A SOURCE THAT ENDPOINTS WILL CALL -- will have default implementations here
  //Called by /info/:source -- get info for a source, whether you need to login, filters available for search


  fetchSourceInfo() {
    //default implementation
    var sourceInfo = {};
    sourceInfo.requiresLogin = false; //will show login to get cookies based on this in app

    sourceInfo.url = '';
    sourceInfo.isCloudFlareSite = false;
    var filters = [];
    sourceInfo.filters = filters;
    return sourceInfo;
  } //Called by /all/:source -- GET all manga from a source (extremely slow for some sources) [NOT USED IN THE APP ANYMORE -- FROM NON PAGINATED DISCOVERY]


  async getAll() {
    //default implementation
    return []; //list of manga(name,url,thumbnail,rank)
  } //Called by /popular/:source/:page -- GET PAGINATED GET ALL (BY POPULAR)

  /*
   -Each source doesn't need to implement this function, only the functions it uses
   --popularMangaSelector()
   --popularMangaRequest(page:Int)
   --popularMangaFromElement(element)
   --getLastPageNumber(currentPageHtml)
   */


  async fetchPopularManga(page
  /*Int*/
  ) {
    console.log(`using default implementation of fetchPopularManga(${page})`);
    var page = parseInt(page);
    console.log("url-- ", this.popularMangaRequest(`${page}`));
    var currentPageHtml = await this.send_request(this.popularMangaRequest(`${page}`)); //console.log("currentPageHtml -- ", currentPageHtml);

    return this.popularMangaParse(page, currentPageHtml);
  } //Called by /latest/:source/:page -- GET PAGINATED GET LATEST - DEFAULT


  async fetchLatestManga(page
  /*Int*/
  ) {
    //return this.mangasPage([/*manga*/], /*hasNexPage*/ false, /*nextPage*/ 1, /*# results*/ 0);
    //this is only default implementation
    var latestUpdatesRequest = this.latestUpdatesRequest(`${page}`);
    var latestUpdatesResponse = '';

    if (latestUpdatesRequest != '') {
      latestUpdatesResponse = await this.send_request(latestUpdatesRequest); //currentPageHtml
    }

    return this.latestUpdatesParse(page, latestUpdatesResponse);
  } //Called by /pagedsearch/:source/:page/:query -- GET PAGINATED SEARCH REQUEST USING FILTERS VALUES PROVIDED IN FRONT-END FROM GETINFO ENPOINT FOR A SOURCE


  async fetchSearchManga(page
  /*Int*/
  , query, filters) {
    //filters will be list of objects with key, value, direction (if sort), main will translate query parameters into filters
    //return this.mangasPage([/*manga*/], /*hasNexPage*/ false, /*nextPage*/ 1, /*# results*/ 0);
    var searchMangaRequest = this.searchMangaRequest(page, query, filters);
    var searchMangaResponse = '';

    if (searchMangaRequest != '') {
      searchMangaResponse = await this.send_request(searchMangaRequest); //currentPageHtml
    }

    return this.searchMangaParse(page, searchMangaResponse, query, filters); //query,filters needed for mangasee
  } //Called by /list/:source/ -- GET LIST OF CHAPTERS AVAILABLE FOR A COMIC -- IMPLEMENTED FOR MANGAREADER, MANGADEX


  async fetchChapterListAndDetails(seriesURL) {
    if (this.chapterListRequest(seriesURL) == this.mangaDetailsRequest(seriesURL)) {
      //both are the same, only do one and parse them for details and chapter
      var chapterListAndDetailsResponse = await this.fetchMangaDetails(seriesURL);
      var $ = cheerio.load(chapterListAndDetailsResponse); //one page, only load it once because cheerio.load takes time for large pages

      var mangaDetails = this.mangaDetailsParse(chapterListAndDetailsResponse, $, seriesURL);
      var chapters = this.chapterListParse(chapterListAndDetailsResponse, $, seriesURL);
      mangaDetails.chapters = chapters;
      return mangaDetails;
    } else {
      //both are different, need two different requests
      var chapterListResponse = await this.fetchChapterList(seriesURL);
      var mangaDetailsResponse = await this.fetchMangaDetails(seriesURL);
      var mangaDetails = this.mangaDetailsParse(mangaDetailsResponse, null, seriesURL);
      var chapters = this.chapterListParse(chapterListResponse, null, seriesURL);
      mangaDetails.chapters = chapters;
      return mangaDetails;
    }
  }

  chapterListAndMangaDetailsParse(chapterListAndDetailsResponse, $, seriesURL) {
    /*if($ == null){ //if necessary done by actual class..
        //var $ = cheerio.load(response);
        $ = cheerio.load(response);
    }*/
    var mangaDetails = this.mangaDetailsParse(chapterListAndDetailsResponse, $, seriesURL);
    var chapters = this.chapterListParse(chapterListAndDetailsResponse, $, seriesURL);
    mangaDetails.chapters = chapters;
    return mangaDetails;
  }
  /*//Default implementation a source can use
  async fetchChapterListAndDetails(seriesURL){
      var mangaDetails = super.mangaDetails("title", "thumbnail", "description", "author", "artist", "status", ["genre1"]);
      mangaDetails.chapters = [super.chapter("url", "language", "0", "1", "title", "date_upload", "scanlator")];
      return mangaDetails;
  }*/
  //Called by /chapter/:source?series=${seriesURL}&chapter=${chapterURL}&number=${chapterNumber}


  async fetchPageList(chapter) {
    var pageListResponse = await this.send_request(this.pageListRequest(chapter));
    return this.pageListParse(pageListResponse);
  }
  /*
  async fetchPageList(chapter){ //chapter is object {series:"seriesURL",chapter:"chapterURL",number:"chapterNumber"}
      //returns list of imageUrls [String]
      return [urls list of pages];
  }*/
  //Called by /login/:source/ ?username&password LOGIN TO A SOURCE, NEEDED FOR MANGADEX (SOURCEINFO WILL TELL APP WHETHER A SOURCE NEEDS THIS) -- will only be called if fetchSourceInfo() states it is needed


  async login(username, password) {
    //returns cookie
    return this.loginParse('');
  } //used by login


  loginRequest(username, password) {
    return ''; //no request
  }

  loginParse(response) {
    return {
      'cookie': ''
    };
  } //this is just a default implementation


  async fetchPageImage(page
  /*JSON*/
  ) {
    //page is JSON so that it can be different for every source and pass whatever it needs to
    const options = {
      url: page.url,
      encoding: null,
      resolveWithFullResponse: false //adding this makes it so that you get back "content-type":"image/jpeg and other stuff, not just the buffer data of the image, //sending false so response is just the image, otherwise I have no idea how to properly decode/encode/save the fucking buffer byte data in ios/swift to an actual image (just opens as a blank)

    };
    console.log("fetchPageImage page.url -", page.url); //cloudscraper instead of rp crashes only on real device..

    var image = await rp(options).then(function (response) {
      //console.log('User has %d repos', repos.length);
      //console.log(buffer);
      //response.body = response.body.toString('base64');
      return response;
    }).catch(function (err) {
      // API call failed...
      return err;
    });
    return image;
  } //async fetchPageImage(page /*JSON*/){
  //    const options = {
  //      url: page.url,
  //      encoding: null,
  //      resolveWithFullResponse: true //adding this makes it so that you get back "content-type":"image/jpeg and other stuff, not just the buffer data of the image,
  //    };
  // //cloudscraper instead of rp crashes only on real device..
  //    rp(options)
  //    .then(function (buffer) {
  //console.log('User has %d repos', repos.length);
  //console.log(buffer);
  //res.send(buffer);
  //          return buffer;
  //     })
  //    .catch(function (err) {
  //       // API call failed...
  //          //res.send(err);
  //          return err;
  //   });
  //}
  //COMMON OBJECT HELPERS


  manga(name, url, thumbnail, rank
  /*, extra {} */
  ) {
    var manga = {};
    manga.name = name;
    manga.url = url;
    manga.thumbnail = thumbnail;
    manga.rank = rank;
    return manga;
  }

  mangasPage(mangas
  /*[manga]*/
  , hasNextPage
  /*Bool*/
  , nextPage
  /*Int*/
  , results
  /*Int*/
  ) {
    var mangasPage = {};
    mangasPage.mangas = mangas;
    mangasPage.hasNextPage = hasNextPage;
    mangasPage.nextPage = parseInt(nextPage); //must  be cast to an Int

    mangasPage.results = results; //this returns an int as is, IDKWTF

    return mangasPage;
  }

  mangaDetails(name, thumbnail, description, author, artist, status, genres
  /*[String]*/
  ) {
    var mangaDetails = {};
    mangaDetails.name = name; //TITLE is WRONG, JSONSeries has name as a property, no wonder this was a problem...

    mangaDetails.thumbnail = thumbnail;
    mangaDetails.description = description;
    mangaDetails.author = author;
    mangaDetails.artist = artist;
    mangaDetails.status = status;
    mangaDetails.genres = genres;
    return mangaDetails;
  }

  chapter(url, language, volume, number, title, date_upload, scanlator) {
    var chapter = {};
    chapter.url = url;
    chapter.language = language;
    chapter.volume = volume;
    chapter.number = number;
    chapter.title = title;
    chapter.date_upload = date_upload;
    chapter.scanlator = scanlator;
    return chapter;
  } //used for pagelist, used to be page(url,options)


  jsonBrowserifyRequest(url
  /*String?*/
  , uri
  /*String?*/
  , method
  /*String? -- GET, POST */
  , headers
  /*[String:String]?*/
  , form
  /*[String:Any]?*/
  ) {
    //var url:String?
    //var uri:String?
    //var method:String? //handle POST for loginRequest (default will be POST)
    //var headers:[String:String]? //TODO -- headers and shit.. // headers could contain url as well
    //var form:[String:Any]? //needed for login POST for now
    var jsonBrowserifyRequest = {};
    jsonBrowserifyRequest.url = url;
    jsonBrowserifyRequest.uri = uri;
    jsonBrowserifyRequest.method = method;
    jsonBrowserifyRequest.headers = headers;
    jsonBrowserifyRequest.form = form;
    return jsonBrowserifyRequest;
  }

  jsonChainedResponse(responseData
  /*[String:String]*/
  , nextRequest
  /*jsonBrowserifyRequest*/
  ) {
    var jsonChainedResponse = {};
    jsonChainedResponse.responseData = responseData;
    jsonChainedResponse.nextRequest = nextRequest;
    return jsonChainedResponse;
  } //hexColors should match values in length if you want to specify colors, but not necessary to specify the colors


  jsonSourceDisplayInfoTag(type
  /*String - one of "bug", "content", "language", "contributor", "tracker", "note",*/
  , values
  /*[String]*/
  , hexColors
  /*HEX COLOR CODES [String]?*/
  ) {
    var jsonSourceDisplayInfoTag = {};
    jsonSourceDisplayInfoTag.type = type;
    jsonSourceDisplayInfoTag.values = values;
    jsonSourceDisplayInfoTag.hexColors = hexColors; //can be null

    return jsonSourceDisplayInfoTag;
  } //used by fetchPopularManga(page)


  popularMangaSelector() {
    return '.string-selector';
  }

  popularMangaRequest(page
  /*Int*/
  ) {
    return this.baseUrl + `/${page}/`;
  }

  popularMangaFromElement(element
  /*cheerio element --> $(this)*/
  ) {
    return this.manga("name", "url", "thumbnail", "rank");
  }

  async getLastPageNumber(firstPageHtml) {
    //for popular
    return 1; //default implementation, there are no more pages
  }

  popularMangaParse(page
  /*Int*/
  , response
  /*String -- popularMangaResponse - currentPageHtml */
  ) {
    var page = parseInt(page); //protect WKNodeBrowserify

    var $ = cheerio.load(response);
    var json = [];
    var popularMangaSelector = this.popularMangaSelector();
    var thisReference = this;
    $(popularMangaSelector).each(function (i, elem) {
      json.push(
      /*new MangaDex().*/
      thisReference.popularMangaFromElement($(this)));
    });
    var lastPageNumber = this.getLastPageNumber(response); //this should work on every page for this source

    var hasNextPage = lastPageNumber > page;
    var nextPage = page + 1; //this doesn't matter if hasNextPage is false

    var results = json.length;

    if (lastPageNumber != null && lastPageNumber > 0) {
      results = results * lastPageNumber;
    }

    return this.mangasPage(json, hasNextPage, nextPage, results);
  } //used by fetchLatestManga(page)


  latestUpdatesRequest(page
  /*Int*/
  ) {
    return ''; //default, if I get this then I know not to make an actual request
  }

  latestUpdatesParse(page
  /*Int*/
  , response
  /*String -- latestUpdatesResponse -- currentPageHtml */
  ) {
    return this.mangasPage([
      /*manga*/
    ],
    /*hasNexPage*/
    false,
    /*nextPage*/
    1,
    /*# results*/
    0);
  } //used by fetchSearchManga


  searchMangaRequest(page
  /*Int*/
  , query, filters) {
    return ''; //default implementation
  }

  searchMangaParse(page, searchMangaResponse, query, filters) {
    //query, filters needed for mangasee
    return this.mangasPage([
      /*manga*/
    ],
    /*hasNexPage*/
    false,
    /*nextPage*/
    1,
    /*# results*/
    0);
  } //used by fetchChapterListAndDetails(seriesURL)


  chapterListAndMangaDetailsRequest(seriesURL) {
    //for updated api with infinite requests, will call this but to support all old sources defaults to calling chapter list request
    return this.chapterListRequest(seriesURL);
  }

  chapterListRequest(seriesURL) {
    return this.baseUrl + seriesURL; //headers?
  }

  mangaDetailsRequest(seriesURL) {
    return this.baseUrl + seriesURL; //headers?
  }

  chapterListParse(response, $, seriesURL) {
    //list of chapter //$ is cheerio.load
    return [];
  }

  mangaDetailsParse(response, $, seriesURL) {
    //mangaDetails object
    return this.mangaDetails("title", "thumbnail", "description", "author", "artist", "status", ["genre1"]
    /*[String]*/
    );
  }

  async fetchMangaDetails(seriesURL) {
    console.log("started fetchMangaDetails");
    var mangaDetailsResponse = await this.send_request(this.mangaDetailsRequest(seriesURL));
    console.log("finished fetchMangaDetails");
    return mangaDetailsResponse;
  }

  async fetchChapterList(seriesURL) {
    console.log("started fetchChapterList");
    var chapterListResponse = await this.send_request(this.chapterListRequest(seriesURL));
    console.log("finished fetchChapterList");
    return chapterListResponse;
  } //used by fetchPageList(chapter)


  pageListRequest(chapter) {
    console.log("pageListRequest", this.baseUrl + chapter.chapter);
    return this.baseUrl + chapter.chapter; //headers ?
  }

  pageListParse(pageListResponse, chapter) {
    return [];
  } //COMMON HELPER FUNCTIONS ALL SOURCES CAN USE
  // Send a request via HTTP


  send_request(url) {
    return rp(url).then(function (htmlString) {
      // Process html...
      //console.log(htmlString);
      return htmlString;
    }).catch(function (err) {
      // Crawling failed...
      //return { statusCode: 400 };
      return err;
    });
  } //String helpers


  trimEnd(character, string) {
    var lastIndexOfCharacter = string.lastIndexOf(character);
    return string.substring(0, lastIndexOfCharacter); //should be /title/39 -- does not include character
  }

  substringAfterLast(character, string) {
    var lastIndexOfCharacter = string.lastIndexOf(character);
    return string.substring(lastIndexOfCharacter + 1, string.length + 1); //should be 39
  }

  substringBeforeLast(character, string) {
    var lastIndexOfCharacter = string.lastIndexOf(character);
    return string.substring(0, lastIndexOfCharacter);
  } //chapterNumber would be name from first ch to first :
  //volume would be numbers before first ch


  substringAfterFirst(substring, string) {
    var startingIndexOfSubstring = string.indexOf(substring);
    var endIndexOfSubstring = startingIndexOfSubstring + substring.length - 1;
    return string.substring(endIndexOfSubstring + 1, string.length);
  }

  substringBeforeFirst(substring, string) {
    var startingIndexOfSubstring = string.indexOf(substring);
    return string.substring(0, startingIndexOfSubstring);
  }

  removeLineBreaks(string) {
    //return string.replace(/(\r\n|\n|\r)/gm, "");
    return string.replace(/[\n\r]/g, "");
  } //if the method is defined here, then we can use it in the subclass without super keyword even
  //we can also simply override in subclass
  //we can also call super. etc yay
  //array helpers


  removeDuplicates(originalArray, prop) {
    var newArray = [];
    var lookupObject = {};

    for (var i in originalArray) {
      lookupObject[originalArray[i][prop]] = originalArray[i];
    }

    for (i in lookupObject) {
      newArray.push(lookupObject[i]);
    }

    return newArray;
  } //search helpers
  //url is the original url -- STRING
  //name is the query param name to add -- STRING
  //value is the query param value to add -- STRING
  //returns updated url with query param added -- STRING
  //isFirstParameter -- BOOL -- whether this is the first query parameter to add to the url or not


  addQueryParameter(url, key, value, isFirstParameter) {
    var newUrl = url;

    if (isFirstParameter) {
      newUrl += `?${key}=${value}`;
    } else {
      newUrl += `&${key}=${value}`;
    }

    return newUrl;
  }

  isEmpty(str) {
    return !str || 0 === str.length;
  }

};