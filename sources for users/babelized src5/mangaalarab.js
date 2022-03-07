'use strict';

const Source = require('./source.js');

var rp = require('request-promise');

var cheerio = require('cheerio');

module.exports = class MangaAlarab extends Source {
  constructor() {
    super();
    this.baseUrl = 'https://mangaalarab.com';
  }

  getRequestWithHeaders(url) {
    var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36(KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36';
    const options = {
      method: 'GET',
      url: url,
      headers: {
        'User-Agent': userAgent
      }
    };
    console.log(`Options are ${JSON.stringify(options)}`);
    return options;
  }

  searchMangaSelector() {
    return this.popularMangaSelector();
  }

  searchMangaFromElement(element) {
    return this.popularMangaFromElement(element);
  }

  latestUpdatesRequest(page) {
    return this.getRequestWithHeaders(this.baseUrl);
  }

  latestUpdatesSelector() {
    return "section:nth-child(5) > div.container > div > article";
  }

  latestUpdatesFromElement(element) {
    var coverElement = element.find('figure > a');
    var url = super.substringAfterFirst('.com', coverElement.attr('href'));
    var name = coverElement.find('img').attr('title');
    var thumbnail = encodeURI(coverElement.find('img').attr('data-src'));
    var rank = '0';
    return super.manga(name, url, thumbnail, rank);
  }

  popularMangaRequest(page) {
    return this.getRequestWithHeaders(`${this.baseUrl}/manga?page=${page}`);
  }

  popularMangaSelector() {
    return 'article';
  }

  popularMangaFromElement(element) {
    var coverElement = element.find('a').first();
    var url = super.substringAfterFirst('.com', coverElement.attr('href'));
    var name = coverElement.find('h3').text().trim();
    var thumbnail = encodeURI(coverElement.find('figure img').attr('data-src'));
    var rank = '0';
    return super.manga(name, url, thumbnail, rank);
  }

  NextPageSelector(firstPageHtml) {
    var $ = cheerio.load(firstPageHtml);
    var nextPage = $('a[rel=next]');

    if (nextPage.contents().length !== 0) {
      return true;
    } else {
      return false;
    }
  }

  chapterListSelector() {
    return "div.chapters-container > div > a";
  }

  chapterListRequest(seriesURL) {
    if (seriesURL.startsWith('http')) {
      return this.getRequestWithHeaders(seriesURL);
    } else {
      return this.getRequestWithHeaders(super.chapterListRequest(seriesURL));
    }
  }

  mangaDetailsRequest(seriesURL) {
    if (seriesURL.startsWith('http')) {
      return this.getRequestWithHeaders(seriesURL);
    } else {
      return this.getRequestWithHeaders(super.mangaDetailsRequest(seriesURL));
    }
  }

  chapterFromElement(chapterElement, source) {
    var $ = cheerio.load(chapterElement);
    var url = super.substringAfterFirst(this.baseUrl, $('a').attr('href'));
    var name = $('div > span').text().trim();
    var scanlator = "";
    var date_upload = $('div > time').first().text().trim();
    var volumeNumber = '';
    var chapterNumber = '';
    const regex = RegExp(/\b\d+\.?\d?\b/g);

    if (name != null) {
      var numbers = name.match(regex);

      if (numbers != null) {
        if (numbers.length > 0) {
          chapterNumber = numbers[0];
          var indexOfFirstNumber = name.indexOf(numbers[0]);
          var indexOfIssueNumberSign = name.indexOf('#');

          if (indexOfFirstNumber > indexOfIssueNumberSign) {
            chapterNumber = numbers[0];
          } else if (numbers.length > 1) {
            chapterNumber = numbers[1];
          }
        } else {
          chapterNumber = "?";
        }
      } else {
        chapterNumber = "?";
      }
    } else {
      chapterNumber = "?";
    }

    return super.chapter(url, "Arabic", volumeNumber, chapterNumber, name, date_upload, scanlator);
  }

  chapterListParse(response, $, seriesURL) {
    console.log(response);
    console.log("started chapterListParse");

    if ($ == null) {
      $ = cheerio.load(response);
    }

    console.log("chapterListParse loaded into cheerio");
    var thisReference = this;
    var chapters = [];
    $(this.chapterListSelector()).each(function (i, chapterElement) {
      var chapter = thisReference.chapterFromElement(chapterElement);
      chapters.push(chapter);
    });
    console.log("chapterListParse finished");
    return chapters;
  }

  mangaDetailsParse(response, $, seriesURL) {
    console.log(response);
    console.log("started mangaDetailsParse");

    if ($ == null) {
      $ = cheerio.load(response);
    }

    console.log("mangaDetailsParse loaded into cheerio");
    let title = $('h1.max-w-xl').text().trim();
    let thumbnail = encodeURI($('figure img').attr('data-src'));
    let author = "Unknown";
    let artist = "Unknown";
    let status = $('div.container > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(6) > span:nth-child(2)').first().text().trim().replace(/مستمرة/gi, "ONGOING").replace(/مكتملة/gi, "COMPLETED");
    var genres = [];
    $('div.text-gray-600 a, div.container > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > span:nth-child(2)').each(function (i, chapterElement) {
      var gen = $(chapterElement).text();
      genres.push(gen);
    });
    let description = $('p.text-sm', $("article").first()).text().trim();
    console.log('finishedMangaDetails parse');
    return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
  }

  pageListSelector() {
    return "div.container > div > div > img";
  }

  pageListRequest(chapter) {
    if (chapter.chapter.startsWith('http')) {
      return this.getRequestWithHeaders(chapter.chapter);
    } else {
      return this.getRequestWithHeaders(super.pageListRequest(chapter));
    }
  }

  async fetchPageList(chapter) {
    var pageListResponse = await this.send_request(this.pageListRequest(chapter));
    return this.pageListParse(pageListResponse, chapter);
  }

  pageListParse(pageListResponse, chapter) {
    var $ = cheerio.load(pageListResponse);
    var thisReference = this;
    var pages = [];
    $(this.pageListSelector()).each(function (i, pageElement) {
      var url = $(pageElement).attr('src');
      var headers = {};
      headers['Referer'] = thisReference.pageListRequest(chapter)['url'];
      headers['Content-Type'] = 'image/jpeg';
      pages.push(thisReference.jsonBrowserifyRequest(url, null, null, headers, null));
    });
    console.log('MangaAlarab pages', pages);
    return pages;
  }

  async fetchPageImage(page) {
    const options = {
      url: page.url,
      encoding: null,
      resolveWithFullResponse: false,
      headers: {
        'Referer': page['headers']['Referer']
      }
    };
    console.log("fetchPageImage options -", options);
    var image = await rp(options).then(function (response) {
      return response;
    }).catch(function (err) {
      return err;
    });
    return image;
  }

  async fetchLatestManga(page) {
    console.log("fetchLatestManga -- MangaAlarab");
    var page = parseInt(page);
    var currentPageHtml = await this.send_request(this.latestUpdatesRequest(`${page}`));
    return this.latestUpdatesParse(page, currentPageHtml);
  }

  latestUpdatesParse(page, response) {
    var $ = cheerio.load(response);
    var json = [];
    $(this.latestUpdatesSelector()).each(function (i, elem) {
      var mangaUpdate = new MangaAlarab().latestUpdatesFromElement($(this));
      mangaUpdate.updates = 1;
      json.push(mangaUpdate);
    });
    var page = parseInt(page);
    var mangasPage = {};
    mangasPage.mangas = json;
    var hasNextPage = false;
    var nextPage = page + 1;
    var results = json.length;
    console.log("MangaAlarab latest -- ", json);
    return super.mangasPage(json, hasNextPage, nextPage, results);
  }

  popularMangaParse(page, response) {
    var $ = cheerio.load(response);
    var json = [];
    var thisReference = this;
    $(this.popularMangaSelector()).each(function (i, elem) {
      json.push(thisReference.popularMangaFromElement($(this)));
    });
    var page = parseInt(page);
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
    var noesa = {
      "paramKey": "esa",
      "displayName": "NOTE: Text will be ignored when using filters",
      "type": "choice",
      "options": {}
    };
    var SortFilter = {
      "paramKey": "sort",
      "displayName": "Order by",
      "type": "choice",
      "default": "latest",
      "options": {
        "latest": "التحديثات الاخيرة",
        "chapters": "عدد الفصول",
        "release": "تاريخ الاصدار",
        "followers": "المتابعين",
        "rating": "التقييم"
      }
    };
    var OTypeFilter = {
      "paramKey": "otype",
      "displayName": "Order Type",
      "type": "choice",
      "default": "desc",
      "options": {
        "desc": "تنازلي",
        "asc": "تصاعدي"
      }
    };
    var GenresSelection = {
      "paramKey": "genreselc",
      "displayName": "Genres Selection",
      "type": "choice",
      "default": "and",
      "options": {
        "and": "ان تحتوى المانجا على كل تصنيف تم تحديده",
        "or": "ان تحتوي المانجا على تصنيف او اكثر من ما تم تحديده"
      }
    };
    var TypeFilter = {
      "paramKey": "typefil",
      "displayName": "Type",
      "type": "choice",
      "options": {
        "manhua": "صينية (مانها)",
        "manhwa": "كورية (مانهوا)",
        "english": "انجليزية",
        "manga": "مانجا (يابانية)"
      }
    };
    var StatusFilter = {
      "paramKey": "status",
      "displayName": "Status",
      "type": "choice",
      "options": {
        "completed": "مكتملة",
        "ongoing": "مستمرة",
        "cancelled": "متوقفة",
        "onhold": "في الانتظار"
      }
    };
    var GeneresLISTS = {
      "paramKey": "genres",
      "displayName": "Genre",
      "type": "tag",
      "options": this.getGenresList()
    };
    filters.push(noesa);
    filters.push(SortFilter);
    filters.push(OTypeFilter);
    filters.push(GenresSelection);
    filters.push(TypeFilter);
    filters.push(StatusFilter);
    filters.push(GeneresLISTS);
    sourceInfo.filters = filters;
    sourceInfo.displayInfo = [];
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language", ["Arabic"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content", ["Manga", "Manhwa", "Manhua"], ["#4D83C1"]));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor", ["xOnlyFadi"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker", ["No"], []));
    console.log("MangaAlarab sourceInfo -- ", sourceInfo);
    return sourceInfo;
  }

  searchMangaRequest(page, query, filters) {
    console.log("MangaAlarab filters -- ", filters);

    if (Object.keys(filters).length === 0) {
      var url = `${this.baseUrl}/search?q=${this.normalizeSearchQuery(query)}&page=${page}`;
      console.log("attempting to fetch search request for MangaAlarab - searchUrl is ", url);
      return this.getRequestWithHeaders(url);
    } else {
      console.log("filters has properties");
      var url = `${this.baseUrl}/manga?page=${page}`;

      for (var i = 0; i < filters.length; i++) {
        switch (filters[i].key) {
          case "sort":
            url = super.addQueryParameter(url, "order", filters[i].value, false);
            break;

          case "otype":
            url = super.addQueryParameter(url, "genresSelection", filters[i].value, false);
            break;

          case "genreselc":
            url = super.addQueryParameter(url, "release", filters[i].value, false);
            break;

          case "typefil":
            url = super.addQueryParameter(url, "types[]", filters[i].value, false);
            break;

          case "status":
            url = super.addQueryParameter(url, "statuses[]", filters[i].value, false);
            break;

          case "genres":
            let filtes = filters[i].value;
            let bois = filtes.replace(/,/g, "&genre[]=");
            url = super.addQueryParameter(url, "genre[]", bois, false);
            break;

          default:
            break;
        }
      }

      console.log("attempting to fetch search request for MangaAlarab - searchUrl is ", url);
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
    query = query.replace(/ /g, "+");
    query = query.replace(/%20/g, "+");
    query = query.replace(/_/g, "+");
    return query;
  }

  searchMangaParse(page, response, query, filters) {
    var json = [];
    var $ = cheerio.load(response);
    $(this.searchMangaSelector()).each(function (i, elem) {
      json.push(new MangaAlarab().searchMangaFromElement($(this)));
    });
    var page = parseInt(page);
    var mangasPage = {};
    mangasPage.mangas = json;
    mangasPage.hasNextPage = this.NextPageSelector(response);
    mangasPage.nextPage = page + 1;
    mangasPage.results = json.length;
    console.log("mangasPage -- ", mangasPage);
    return mangasPage;
  }

  getGenresList() {
    return {
      "1": "اكشن",
      "2": "مغامرة",
      "3": "خيالي",
      "4": "سحر",
      "5": "من ضعيف لقوي",
      "6": "زنزانة",
      "7": "بناء على رواية ويب",
      "8": "فنون قتالية",
      "9": "اعادة البعث",
      "10": "السفر عبر الزمن",
      "11": "رومانسي",
      "12": "كوميدي",
      "13": "الانتقال الى عالم اخر",
      "14": "تاريخي",
      "15": "انتقام",
      "16": "حياة مدرسية",
      "17": "مصاصي دماء",
      "18": "غموض",
      "19": "رعب",
      "20": "دراما",
      "21": "نفسي"
    };
  }

};