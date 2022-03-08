'use strict';

const Source = require('./source.js');

var rp = require('request-promise');

var cheerio = require('cheerio'); //var cloudscraper = require('cloudscraper'); //for image download to bypass cloudflare


module.exports = class Readcomiconline extends Source {
  constructor() {
    super(); //super must be called first otherwise variables are "used before declaration"
    //The manga provider to download the pages from

    this.baseUrl = 'https://readcomiconline.li';
  } //readcomiconline


  getRequestWithHeaders(url
  /*:String*/
  ) {
    var userAgent = 'Mozilla/5.0 (Windows NT 6.3; WOW64)'; //specific for readcomiconline

    const options = {
      url: url,
      headers: {
        'User-Agent': userAgent
      }
    };
    return options;
  } //readcomiconline


  searchMangaSelector() {
    return this.popularMangaSelector();
  }

  searchMangaFromElement(element
  /*cheerio element --> $(this)*/
  ) {
    return this.mangaFromElement(element);
  } //readcomiconline


  mangaFromElement(element
  /*cheerio element --> $(this)*/
  ) {
    //without a selector
    var aElement = element.find('a').first();
    var url = aElement.attr("href"); //super.substringAfterFirst('.com', aElement.attr("href"));

    var name = super.removeLineBreaks(aElement.text()).replace(/^\s+|\s+$/g, '');
    var rawTitleHTML = element.attr("title"); //title of td is html with src="/Uploads/Etc/4-19-2016/3403002837Untitled-8.jpg" somewhere in it..

    console.log("rawTitleHTML -- ", rawTitleHTML);
    var titleCheerio = cheerio.load(rawTitleHTML);
    var thumbnail_url = titleCheerio('img').first().attr("src"); //thumbnail sometimes already has https, so don't use baseUrl for those

    var thumbnail = thumbnail_url;

    if (!thumbnail_url.includes("https")) {
      thumbnail = `${this.baseUrl}${thumbnail_url}`;
    } //with a selector

    /*var url = super.substringAfterFirst('.com', element.attr("href"));
    var name = super.removeLineBreaks(element.text()).replace(/^\s+|\s+$/g,'');
    var thumbnail = `${this.baseUrl}${element.find("img").first().attr("src")}`;//"http://aidsface.com"*/
    //extra


    var rank = '0'; //this must be a fucking string
    //console.log(`mangaFromElement readcomiconline -- url: ${url}, name: ${name}, thumbnail: ${thumbnail}`);

    return super.manga(name, url, thumbnail, rank);
  } //readcomiconline


  latestUpdatesRequest(page
  /*Int*/
  ) {
    let latestUpdatesRequestURL = this.baseUrl + `/ComicList/LatestUpdate?page=${page}`;
    console.log("readcomiconline latestUpdatesRequest -- ", latestUpdatesRequestURL);
    return this.getRequestWithHeaders(latestUpdatesRequestURL);
  } //readcomiconline


  latestUpdatesSelector() {
    return this.popularMangaSelector();
  }

  latestUpdatesFromElement(element
  /*cheerio element --> $(this)*/
  ) {
    var x = this.mangaFromElement(element);
    console.log("lastestMange -- ", x);
    return x;
  } //readcomiconline


  popularMangaRequest(page
  /*Int*/
  ) {
    let popularMangaRequestURL = this.baseUrl + `/ComicList/MostPopular?page=${page}`;
    return this.getRequestWithHeaders(popularMangaRequestURL);
  } //readcomiconline


  popularMangaSelector() {
    return 'table.listing tr:has(a) td:nth-child(1)';
  } //readcomiconline


  popularMangaFromElement(element
  /*cheerio element --> $(this)*/
  ) {
    return this.mangaFromElement(element);
  }

  getLastPageNumber(firstPageHtml) {
    //for popular
    var $ = cheerio.load(firstPageHtml);
    var lastPageHREFText = $('.pagination a').last().text(); //"Last" if not last page, a number if the last page

    console.log("lastPageHREFText --", lastPageHREFText);
    var lastNumbersOnly = lastPageHREFText.match(/\d/g);
    var lastNumber = 0;
    var thisReference = this;

    if (lastNumbersOnly != null && lastNumbersOnly.length > 0) {
      //protect against results with no paging, there won't be a next page if there is only 1 page
      lastNumber = lastNumbersOnly.join('');
    } else {
      var lastPageHREFTextPageNumber = $('.pagination a').last().attr('page');
      var lastLinkNumbersOnly = lastPageHREFTextPageNumber.match(/\d/g);
      console.log("lastLinkNumbersOnly --", lastLinkNumbersOnly);

      if (lastLinkNumbersOnly != null && lastLinkNumbersOnly.length > 0) {
        //protect against results with no paging, there won't be a next page if there is only 1 page
        lastNumber = lastLinkNumbersOnly.join('');
      } else {
        //not the last page -- this will give the last visible page number link, but we should get the actual page NUMBER from last
        var bruteLastNumbersOnly = [];
        $('.pagination a').each(function (i, pageElement) {
          var paginationText = $(pageElement).text();
          var paginationNumbersOnly = paginationText.match(/\d/g);

          if (paginationNumbersOnly != null && paginationNumbersOnly.length > 0) {
            bruteLastNumbersOnly = paginationNumbersOnly;
          }
        });

        if (bruteLastNumbersOnly != null && bruteLastNumbersOnly.length > 0) {
          //protect against results with no paging, there won't be a next page if there is only 1 page
          lastNumber = bruteLastNumbersOnly.join('');
        }

        console.log("bruteLastNumbersOnly --", bruteLastNumbersOnly);
      }
    } //console.log("lastNumber --", lastNumber);


    return parseInt(lastNumber);
  }

  getLastPageNumberForLatest(latestPageHtml) {
    return this.getLastPageNumber(latestPageHtml);
  }

  getLastPageNumberForSearch(searchPageHtml) {
    return this.getLastPageNumber(searchPageHtml);
  } //readcomiconline


  chapterListSelector() {
    //return "table.listing tr:gt(1)"; //cheerio can only do .gt()
    return "table.listing tr";
  } //TODOAIDS -- override fetch list/details to decipher options and treat as one thing for one request only
  //readcomiconline


  chapterListRequest(seriesURL) {
    if (seriesURL.startsWith('http')) {
      return this.getRequestWithHeaders(seriesURL);
    } else {
      return this.getRequestWithHeaders(super.chapterListRequest(seriesURL));
    }
  } //readcomiconline


  mangaDetailsRequest(seriesURL) {
    if (seriesURL.startsWith('http')) {
      return this.getRequestWithHeaders(seriesURL);
    } else {
      return this.getRequestWithHeaders(super.chapterListRequest(seriesURL));
    }
  } //readcomiconline


  chapterFromElement(chapterElement, source) {
    var $ = cheerio.load(chapterElement);
    var chapterAElement = $('a').first();
    var url = chapterAElement.attr('href').replace(this.baseUrl, "");
    console.log("chapterURL is --", url);
    var name = super.removeLineBreaks(chapterAElement.text()).replace(/^\s+|\s+$/g, '');
    var scanlator = ""; //TODO

    var date_upload = $("td").eq(1).first().text(); //Vol tbd. chapter 60

    var volumeNumber = '';
    var chapterNumber = '';
    const regex = RegExp(/\b\d+\.?\d?\b/g);

    if (name != null) {
      console.log("chapterName -- ", name);
      var numbers = name.match(regex); //console.log(`title numbers -- , ${numbers}, name -- , ${name}`);

      if (numbers != null) {
        if (numbers.length > 0) {
          chapterNumber = numbers[0]; //a default

          var indexOfFirstNumber = name.indexOf(numbers[0]);
          var indexOfIssueNumberSign = name.indexOf('#');

          if (indexOfFirstNumber > indexOfIssueNumberSign) {
            chapterNumber = numbers[0];
          } else if (numbers.length > 1) {
            chapterNumber = numbers[1];
          }
        } else {
          chapterNumber = "?"; //no numbers at all
        }
      } else {
        chapterNumber = "?";
      }
    } else {
      chapterNumber = "?"; //no name, no chapter
    }

    return super.chapter(url, "English", volumeNumber, chapterNumber, name, date_upload, scanlator);
  }

  chapterListParse(response, $, seriesURL
  /*not necessary for readcomiconline but needs to match api*/
  ) {
    //list of chapter
    console.log("started chapterListParse");

    if ($ == null) {
      //var $ = cheerio.load(response);
      $ = cheerio.load(response);
    }

    console.log("chapterListParse loaded into cheerio");
    var thisReference = this;
    var chapters = [];
    $(this.chapterListSelector()).each(function (i, chapterElement) {
      if (i > 1) {
        //first 2 are title/space
        var chapter = thisReference.chapterFromElement(chapterElement);
        chapters.push(chapter);
      }
    });
    console.log("chapterListParse finished");
    return chapters;
  }

  mangaDetailsParse(response, $, seriesURL
  /*not necessary for readcomiconline but needs to match api*/
  ) {
    //mangaDetails object

    /*val infoElement = document.select("div.barContent").first()
             val manga = SManga.create()
            manga.artist = infoElement.select("p:has(span:contains(Artist:)) > a").first()?.text()
            manga.author = infoElement.select("p:has(span:contains(Writer:)) > a").first()?.text()
            manga.genre = infoElement.select("p:has(span:contains(Genres:)) > *:gt(0)").text()
            manga.description = infoElement.select("p:has(span:contains(Summary:)) ~ p").text()
            manga.status = infoElement.select("p:has(span:contains(Status:))").first()?.text().orEmpty().let { parseStatus(it) }
            manga.thumbnail_url = document.select(".rightBox:eq(0) img").first()?.absUrl("src")
            return manga*/
    console.log("mangaDetailsParse -- url -- ", seriesURL);

    if ($ == null) {
      //var $ = cheerio.load(response);
      $ = cheerio.load(response);
    }

    var infoElement = $("div.barContent").first();
    var title = super.removeLineBreaks(infoElement.find("a").first().text()).replace(/^\s+|\s+$/g, ''); //this isn't even pulled from here in the app..

    console.log("mangaDetailsParse title - ", title);
    var artist = infoElement.find("p:has(span:contains(Artist:)) > a").first().text(); //

    var author = infoElement.find("p:has(span:contains(Writer:)) > a").first().text(); //

    var genres = [];
    infoElement.find("p:has(span:contains(Genres:)) > a").each(function (i, aElement) {
      genres.push($(aElement).text());
    });
    var description = infoElement.find("p:has(span:contains(Summary:)) ~ p").text();
    var status = infoElement.find("p:has(span:contains(Status:))").first().text();
    var thumbnail = $(".rightBox .barContent img").first().attr("src");

    if (!thumbnail.includes("https")) {
      thumbnail = `${this.baseUrl}${thumbnail}`;
    }

    return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
  } //readcomiconline


  pageListSelector() {
    return ".divImage img";
  } //readcomiconline


  pageListRequest(chapter) {
    var url = chapter.chapter; //relative url
    //quality could be hq or lq

    if (chapter.chapter.startsWith('http')) {
      //readType=1 to get all pages
      url = `${chapter.chapter}&readType=1&quality=hq`; //headers?
    } else {
      url = `${super.pageListRequest(chapter)}&readType=1&quality=hq`;
    }

    console.log("pageListRequest url is ", url);
    return this.getRequestWithHeaders(url);
  } //override super because we need the chapter


  async fetchPageList(chapter) {
    var pageListResponse = await this.send_request(this.pageListRequest(chapter));
    return this.pageListParse(pageListResponse, chapter);
  }

  pageListParse(pageListResponse, chapter) {
    var $ = cheerio.load(pageListResponse);
    var thisReference = this;
    var pages = []; //const regex = RegExp(/lstImages\.push\(\"(http.*)\"\)/g);

    const regex = RegExp(/http.*(?=\"\);)(?!lstImages\.push\(\")/g);
    pages = pageListResponse.match(regex);
    var headers = {};
    pages = pages.map(url => thisReference.jsonBrowserifyRequest(url, null, null, headers, null));
    console.log('readcomiconline pages', pages);
    return pages;
  } //shouldn't need this anymore..


  async fetchPageImage(page
  /*JSONBrowserifyRequest*/
  ) {
    //page is JSON so that it can be different for every source and pass whatever it needs to
    const options = {
      url: page.url,
      encoding: null,
      resolveWithFullResponse: false,
      //adding this makes it so that you get back "content-type":"image/jpeg and other stuff, not just the buffer data of the image, //sending false so response is just the image, otherwise I have no idea how to properly decode/encode/save the fucking buffer byte data in ios/swift to an actual image (just opens as a blank)
      headers: {
        'Referer': page['headers']['Referer']
      }
    };
    console.log("fetchPageImage options -", options); //cloudscraper instead of rp crashes only on real device..

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
  } //ENDPOINT 3 - PAGINATED LATEST


  async fetchLatestManga(page
  /*Int*/
  ) {
    console.log("fetchLatestManga -- readcomiconline");
    var page = parseInt(page);
    var currentPageHtml = await this.send_request(this.latestUpdatesRequest(`${page}`)); //console.log("currentPageHtml -- ", currentPageHtml);

    return this.latestUpdatesParse(page, currentPageHtml);
  } //readcomiconline


  latestUpdatesParse(page
  /*Int*/
  , response
  /*String -- latestUpdatesResponse -- currentPageHtml */
  ) {
    //return this.mangasPage([/*manga*/], /*hasNexPage*/ false, /*nextPage*/ 1, /*# results*/ 0);
    var page = parseInt(page); //protect WKNodeBrowserify

    var latestUpdatesSelector = this.latestUpdatesSelector();
    var $ = cheerio.load(response); //DEFAULT

    var json = [];
    $(latestUpdatesSelector).each(function (i, elem) {
      var mangaUpdate = new Readcomiconline().latestUpdatesFromElement($(this));
      mangaUpdate.updates = 1; //always 1 update for readcomiconline, so can just use default implementation and add this

      json.push(mangaUpdate);
    });
    console.log("mangenlo latest -- ", json);
    var mangasPage = {};
    mangasPage.mangas = json;
    var lastPageNumber = this.getLastPageNumberForLatest(response); //this should work on every page for this source

    var hasNextPage = lastPageNumber > page;
    var nextPage = page + 1; //this doesn't matter if hasNextPage is false

    var results = json.length;

    if (lastPageNumber != null && lastPageNumber > 0) {
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
    var genreFilter = {};
    genreFilter.paramKey = 'genres';
    genreFilter.displayName = 'Genres';
    genreFilter.type = 'tag'; //multiple choice

    genreFilter.options = this.getGenresList();
    var statusFilter = {};
    statusFilter.paramKey = 'status';
    statusFilter.displayName = 'Status';
    statusFilter.type = 'choice'; //drop-down single choice

    statusFilter.options = {};
    statusFilter.options['completed'] = 'Completed';
    statusFilter.options['ongoing'] = 'Ongoing';
    filters.push(genreFilter);
    filters.push(statusFilter);
    sourceInfo.filters = filters;
    sourceInfo.displayInfo = []; //[JSONSourceDisplayInfoTag]?
    //jsonSourceDisplayInfoTag(type /*String - one of "bug", "content", "language", "contributor", "tracker", "note",*/, values /*[String]*/, hexColors /*HEX COLOR CODES [String]?*/)

    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language", ["English"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content", ["Comics"], ["#4D83C1"]));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor", ["mangaxmanga"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker", ["No"], [])); //should just be No or Yes

    console.log("readcomiconline sourceInfo -- ", sourceInfo);
    return sourceInfo;
  } //readcomiconline


  urlencodeFormData(fd) {
    var s = '';

    function encode(s) {
      return encodeURIComponent(s).replace(/%20/g, '+');
    } ///for(var pair of fd.entries()){


    for (let key in fd) {
      if (typeof fd[key] == 'string') {
        s += (s ? '&' : '') + encode(key) + '=' + encode(fd[key]);
      }
      /*if(typeof pair[1]=='string'){
          s += (s?'&':'') + encode(pair[0])+'='+encode(pair[1]);
      }*/

    }

    return s;
  }

  searchMangaRequest(page
  /*Int*/
  , query, filters) {
    var uri = '';
    console.log("readcomiconline filters -- ", filters);

    if (Object.keys(filters).length === 0) {
      //check dictionary/object is empty
      console.log("filters are empty"); //addQueryParameter(url, name, value, isFirstParameter) //keyword is the parameter

      var url = this.baseUrl + '/Search/Comic?keyword=' + this.normalizeSearchQuery(query); // + `&page=${page}`; //headers -- TODO

      /*
       this works
       uri for formdata --  https://readcomiconline.li/Search/Comic?keyword=dog
       readcomiconline searchRequest options --  {
         uri: 'https://readcomiconline.li/Search/Comic?keyword=dog',
         method: 'POST',
         headers: {
           'Content-Type': 'application/x-www-form-urlencoded',
           'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64)',
           'Content-Length': '51'
         }
       }
       */

      uri = url;
    } else {
      console.log("filters has properties");
      var isFirstParameter = true; //var url = this.baseUrl + `/AdvanceSearch?page=${page}`;

      var url = this.baseUrl + `/AdvanceSearch`;

      if (!super.isEmpty(query)) {
        url = super.addQueryParameter(url, "comicName", this.normalizeSearchQuery(query), isFirstParameter); //search query

        isFirstParameter = false;
      } else {
        url = super.addQueryParameter(url, "comicName", '', isFirstParameter);
        isFirstParameter = false;
      } ////////////////////


      for (var i = 0; i < filters.length; i++) {
        switch (filters[i].key) {
          case "genres":
            //values is comma list
            var selectedGenreKeys = filters[i].value.split(",");
            var getGenresOrderedKeyList = this.getGenresOrderedKeyList();
            var genresValue = '';

            for (var genreKeyIndex = 0; genreKeyIndex < getGenresOrderedKeyList.length; genreKeyIndex++) {
              if (selectedGenreKeys.includes(getGenresOrderedKeyList[genreKeyIndex])) {
                url = super.addQueryParameter(url, "genres", '1', isFirstParameter); //1 is selected

                isFirstParameter = false;
                /*if(genresValue.length == 0){
                    genresValue = '1';
                }
                else {
                    genresValue = `${genresValue},1`;
                }*/
              } else {
                url = super.addQueryParameter(url, "genres", '0', isFirstParameter); //0 is unselected

                isFirstParameter = false;
                /*if(genresValue.length == 0){
                    genresValue = '0';
                }
                else {
                    genresValue = `${genresValue},0`;
                }*/
              }
            }

            url = super.addQueryParameter(url, "genres", genresValue, isFirstParameter); //0 is unselected

            isFirstParameter = false; //this.getGenresOrderedKeyList().indexOf('bison')

            break;

          case "status":
            url = super.addQueryParameter(url, "status", filters[i].value, false);
            break;

          default:
            break;
        }
      }

      if (!url.includes("status")) {
        url = super.addQueryParameter(url, "status", '', false);
      }
      /*var options = {};
      options = {
             uri: url,
             headers: {
                 'Referer' : this.baseUrl
             }
      };
      console.log("attempting to fetch search request for readcomiconline - searchUrl is ", url);
      return options;*/


      uri = url;
      uri = 'https://readcomiconline.li/AdvanceSearch?comicName=&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=1&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&genres=0&status=';
    } //TODOAIDS

    /*var formData = {
        // Like <input type="text" name="name">
        'user_name': username,
        'password': password,
        'cookie':'1',
        'sublogin': 'Login',
        'submit': '1',
        'csrf_token': csrf
    };
       */
    // var uri = `https://myanimelist.net/login.php?${this.urlencodeFormData(formData)}`;


    console.log('uri for formdata -- ', uri);
    var options = {
      //encoding: 'utf8',
      ///uri: `https://myanimelist.net/login.php?user_name=${username}&password=${password}&csrf_token=${csrf}`,
      uri: uri,
      method: 'POST',
      //headers = { 'Content-Type': 'application/json' };
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64)',
        //"Accept": "application/json",
        "Content-Length": `${uri.length}` // - 41
        // //'origin': 'https://myanimelist.net',
        //    //'referer': 'https://myanimelist.net/login.php?from=%2F'

      }
      /*,*/

      /*
      form: {
        // Like <input type="text" name="name">
        user_name: username,
        password: password,
        cookie:'1',
        sublogin: 'Login',
        submit: '1',
        csrf_token: csrf
        
      },*/
      //resolveWithFullResponse: true //get more than just body, cookies are in header, so need to set this

    };
    console.log('readcomiconline searchRequest options -- ', options);
    return options;
  }

  normalizeSearchQuery(query
  /*String*/
  )
  /*:String*/
  {
    var query = query.toLowerCase();
    query = query.replace(/[àáạảãâầấậẩẫăằắặẳẵ]+/g, "a");
    query = query.replace(/[èéẹẻẽêềếệểễ]+/g, "e");
    query = query.replace(/[ìíịỉĩ]+/g, "i");
    query = query.replace(/[òóọỏõôồốộổỗơờớợởỡ]+/g, "o");
    query = query.replace(/[ùúụủũưừứựửữ]+/g, "u");
    query = query.replace(/[ỳýỵỷỹ]+/g, "y");
    query = query.replace(/[đ]+/g, "d");
    query = query.replace(/ /g, "+"); //remove spaces //this is what will be in the URL + instead of a space -- fixes search with spaces

    query = query.replace(/%20/g, "+");
    query = query.replace(/_/g, "+"); //TODO
    //str = str.replace("""!|@|%|\^|\*|\(|\)|\+|=|<|>|\?|/|,|\.|:|;|'| |"|&|#|\[|]|~|-|$|_""".toRegex(), "_")
    //str = str.replace("_+_".toRegex(), "_")
    //str = str.replace("""^_+|_+$""".toRegex(), "")

    return query;
  }

  searchMangaParse(page
  /*Int*/
  , response
  /*String -- latestUpdatesResponse -- currentPageHtml */
  , query, filters) {
    var page = parseInt(page); //protect WKNodeBrowserify

    var searchMangaSelector = this.searchMangaSelector();
    console.log("readcomiconline searchMangaResponse -- ", response);
    var $ = cheerio.load(response);
    var directManga = $('.barTitle', $('.rightBox'));

    if (directManga != null) {
      directManga = directManga.first().text().trim();
    } //checks if the comic was redirected and then makes one page mangapage


    if (`${directManga}`.toLowerCase() == 'cover') {
      let name = $('.bigChar', $('.bigBarContainer').first()).text().trim();
      let url = $('.bigChar').attr('href');
      var thumbnail_url = $('img', $('.rightBox')).attr('src');
      var directed = [];
      var thumbnail = thumbnail_url;

      if (!thumbnail_url.includes("https")) {
        thumbnail = `${this.baseUrl}${thumbnail_url}`;
      }

      var rank = '0';
      directed.push({
        name,
        url,
        thumbnail,
        rank
      });
      var mangasPage = {};
      mangasPage.mangas = directed;
      mangasPage.hasNextPage = false; //lastPageNumber > page; //search not paged for readcomiconline

      mangasPage.nextPage = page + 1; //this doesn't matter if hasNextPage is false

      console.log("mangasPage -- ", mangasPage);
      var results = directed.length; //if (lastPageNumber != null && lastPageNumber > 0){
      //    results = results * lastPageNumber;
      //}
      //return this.mangasPage(json, hasNextPage, nextPage, results);

      mangasPage.results = results;
      return mangasPage;
    } else {
      var json = [];
      $(searchMangaSelector).each(function (i, elem) {
        json.push(new Readcomiconline().searchMangaFromElement($(this)));
      });
      var page = parseInt(page); //important for nextPage = page + 1
      //console.log("finished parse json - ", json);
      //var lastPageNumber = this.getLastPageNumberForSearch(response); //this should work on every page for this source
      // console.log("lastPageNumber - ",lastPageNumber);

      var mangasPage = {};
      mangasPage.mangas = json;
      mangasPage.hasNextPage = false; //lastPageNumber > page; //search not paged for readcomiconline

      mangasPage.nextPage = page + 1; //this doesn't matter if hasNextPage is false

      console.log("mangasPage -- ", mangasPage);
      var results = json.length; //if (lastPageNumber != null && lastPageNumber > 0){
      //    results = results * lastPageNumber;
      //}
      //return this.mangasPage(json, hasNextPage, nextPage, results);

      mangasPage.results = results;
      return mangasPage; //console.log(searchPageHtml);
    }
  } //readcomiconline


  getGenresList() {
    return {
      'Action': 'Action',
      'Adventure': 'Adventure',
      'Anthology': 'Anthology',
      'Anthropomorphic': 'Anthropomorphic',
      'Biography': 'Biography',
      'Children': 'Children',
      'Comedy': 'Comedy',
      'Crime': 'Crime',
      'Drama': 'Drama',
      'Family': 'Family',
      'Fantasy': 'Fantasy',
      'Fighting': 'Fighting',
      'Graphic-Novels': 'Graphic Novels',
      'Historical': 'Historical',
      'Horror': 'Horror',
      'Leading-Ladies': 'Leading Ladies',
      'LGBTQ': 'LGBTQ',
      'Literature': 'Literature',
      'Manga': 'Manga',
      'Martial-Arts': 'Martial Arts',
      'Mature': 'Mature',
      'Military': 'Military',
      'Movies-TV': 'Movies & TV',
      'Music': 'Music',
      'Mystery': 'Mystery',
      'Mythology': 'Mythology',
      'Personal': 'Personal',
      'Political': 'Political',
      'Post-Apocalyptic': 'Post-Apocalyptic',
      'Psychological': 'Psychological',
      'Pulp': 'Pulp',
      'Religious': 'Religious',
      'Robots': 'Robots',
      'Romance': 'Romance',
      'School-Life': 'School Life',
      'Sci-Fi': 'Sci-Fi',
      'Slice-of-Life': 'Slice of Life',
      'Sport': 'Sport',
      'Spy': 'Spy',
      'Superhero': 'Superhero',
      'Supernatural': 'Supernatural',
      'Suspense': 'Suspense',
      'Thriller': 'Thriller',
      'Vampires': 'Vampires',
      'Video-Games': 'Video Games',
      'War': 'War',
      'Western': 'Western',
      'Zombies': 'Zombies'
    };
  }

  getGenresOrderedKeyList() {
    return ['Action', 'Adventure', 'Anthology', 'Anthropomorphic', 'Biography', 'Children', 'Comedy', 'Crime', 'Drama', 'Family', 'Fantasy', 'Fighting', 'Graphic-Novels', 'Historical', 'Horror', 'Leading-Ladies', 'LGBTQ', 'Literature', 'Manga', 'Martial-Arts', 'Mature', 'Military', 'Movies-TV', 'Music', 'Mystery', 'Mythology', 'Personal', 'Political', 'Post-Apocalyptic', 'Psychological', 'Pulp', 'Religious', 'Robots', 'Romance', 'School-Life', 'Sci-Fi', 'Slice-of-Life', 'Sport', 'Spy', 'Superhero', 'Supernatural', 'Suspense', 'Thriller', 'Vampires', 'Video-Games', 'War', 'Western', 'Zombies'];
  } //ENDPOINT 2- GET ALL
  //READCOMICONLINE GET ALL
  //this uses promises to do everything in parallel -> 7 seconds to get all results


  async getAll() {
    console.log(this.popularMangaRequest(1));
    var firstPageHtml = await new Readcomiconline().send_request(this.popularMangaRequest(1)); //this.getAllPageNumbers(firstPageHtml);

    var allPageNumbers = this.getAllPageNumbers(firstPageHtml); //[1] --> set to 1 to only get first page

    console.log("allPageNumbers=", allPageNumbers);
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

    while (current < allPageNumbers[allPageNumbers.length - 1]) {
      var starting = current;
      var last = current;
      var batchPages = [];

      for (var i = current; i < current + maxConcurrent; i++) {
        if (i > allPageNumbers[allPageNumbers.length - 1]) {//skip non-existent page
          //current = i - 1;
          //break;
        } else {
          batchPages.push(i);
          last = i;
        }
      }

      current = last + 1;
      console.log("starting batched for ", starting, "-", last);
      const promises = batchPages.map(number => new Readcomiconline().send_request(this.popularMangaRequest(`${number}`)));
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
      batchedResults.forEach(function (currentPageHtml) {
        var $ = cheerio.load(currentPageHtml);
        $(popularMangaSelector).each(function (i, elem) {
          json.push(new Readcomiconline().popularMangaFromElement($(this)));
        });
      });
      console.log("finished loop for batched for ", starting, "-", last);
    }

    console.log("done getting all readcomconline");
    return json;
  }

  getAllPageNumbers(firstPageHtml) {
    var lastNumber = this.getLastPageNumber(firstPageHtml); //[...Array(N+1).keys()].slice(1)
    //var pageNumbers = [...Array(lastNumber+1).keys()].slice(1); //this works
    //console.log("pageNumbers-",pageNumbers);

    console.log("lastNumber is ", lastNumber);
    var pageNumbers = [];

    for (var i = 1; i <= lastNumber; i++) {
      //with lastNumber works locally, but times out on phone (796 pages so... 31802 manga)
      pageNumbers.push(i);
    }

    console.log("pageNumbers-", pageNumbers);
    return pageNumbers;
  }

};