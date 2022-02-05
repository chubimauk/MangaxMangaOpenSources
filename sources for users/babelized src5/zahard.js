'use strict';

const Source = require('./source.js');

var rp = require('request-promise');

var cheerio = require('cheerio');

module.exports = class Zahard extends Source {
  constructor() {
    super();
    this.baseUrl = 'https://zahard.xyz';
  }

  searchMangaFromElementJSON(element) {
    const obj = JSON.parse(element.text().trim());
    const allMangas = [];

    for (var vals in obj.suggestions) {
      var url = `/manga/${obj.suggestions[vals].data}`;
      var name = obj.suggestions[vals].value;
      var thumbnail = `${this.baseUrl}/uploads${url}/cover/cover_250x350.jpg`;
      var rank = '0';
      allMangas.push({
        name,
        url,
        thumbnail,
        rank
      });
    }

    return allMangas;
  }

  searchMangaFromElement(element) {
    var coverElement = element.find('a').first();
    var url = super.substringAfterFirst('.xyz', 'https:' + coverElement.attr('href'));
    var name = element.find("strong").text();
    var thumbnail = element.find('img').first().attr('src');
    var rank = '0';
    return super.manga(name, url, thumbnail, rank);
  }

  getLastPageNumberForSearch(element, page) {
    var $ = cheerio.load(element);
    var lastPageHREFTex = $('a[rel="next"]').attr("href");

    if (lastPageHREFTex === undefined) {
      return parseInt(page);
    } else {
      var lastPageHREFText = super.substringAfterFirst("page=", lastPageHREFTex);
      var lastNumbersOnly = lastPageHREFText.match(/\d/g);
      var lastNumber = 0;

      if (lastNumbersOnly != null && lastNumbersOnly.length > 0) {
        lastNumber = lastNumbersOnly.join('');
      }

      return parseInt(lastNumber);
    }
  }

  searchMangaSelector() {
    return 'div.col-sm-6';
  }

  latestUpdatesRequest(page) {
    return `${this.baseUrl}/latest-release?page=${page}`;
  }

  latestUpdatesSelector() {
    return "div.mangalist div.manga-item";
  }

  latestUpdatesFromElement(element) {
    var coverElement = element.find('h3 a').first();
    var url = super.substringAfterFirst('.xyz', 'https:' + coverElement.attr('href'));
    var name = coverElement.text();
    var thumbnail = `${this.baseUrl}/uploads/manga/${super.substringAfterLast('/', url)}/cover/cover_250x350.jpg`;
    var rank = '0';
    return super.manga(name, url, thumbnail, rank);
  }

  popularMangaRequest(page) {
    return `${this.baseUrl}/filterList?page=${page}&sortBy=views&asc=false`;
  }

  popularMangaSelector() {
    return 'div.col-sm-6';
  }

  popularMangaFromElement(element) {
    var coverElement = element.find('a').first();
    var url = super.substringAfterFirst('.xyz', 'https:' + coverElement.attr('href'));
    var name = element.find("strong").text();
    var thumbnail = element.find('img').first().attr('src');
    var rank = '0';
    return super.manga(name, url, thumbnail, rank);
  }

  getLastPageNumberForLatest(element, page) {
    var $ = cheerio.load(element);
    var lastPageHREFTex = $('a[rel="next"]').attr("href");

    if (lastPageHREFTex === undefined) {
      return parseInt(page);
    } else {
      var lastPageHREFText = super.substringAfterFirst("page=", lastPageHREFTex);
      var lastNumbersOnly = lastPageHREFText.match(/\d/g);
      var lastNumber = 0;

      if (lastNumbersOnly != null && lastNumbersOnly.length > 0) {
        lastNumber = lastNumbersOnly.join('');
      }

      return parseInt(lastNumber);
    }
  }

  getLastPageNumberForPopular(element, page) {
    var $ = cheerio.load(element);
    var lastPageHREFTex = $('a[rel="next"]').attr("href");

    if (lastPageHREFTex === undefined) {
      return parseInt(page);
    } else {
      var lastPageHREFText = super.substringAfterFirst("page=", lastPageHREFTex);
      var lastNumbersOnly = lastPageHREFText.match(/\d/g);
      var lastNumber = 0;

      if (lastNumbersOnly != null && lastNumbersOnly.length > 0) {
        lastNumber = lastNumbersOnly.join('');
      }

      return parseInt(lastNumber);
    }
  }

  chapterListSelector() {
    return "ul[class^=chapters] > li:not(.btn), table.table tr";
  }

  chapterListRequest(seriesURL) {
    if (seriesURL.startsWith('http')) {
      return seriesURL;
    } else {
      return super.chapterListRequest(seriesURL);
    }
  }

  mangaDetailsRequest(seriesURL) {
    if (seriesURL.startsWith('http')) {
      return seriesURL;
    } else {
      return super.mangaDetailsRequest(seriesURL);
    }
  }

  chapterFromElement(chapterElement, source) {
    var $ = cheerio.load(chapterElement);
    var chapterAElement = $('a');
    var url = super.substringAfterFirst(this.baseUrl, chapterAElement.attr('href'));
    var name = chapterAElement.text();
    var scanlator = "";
    var date_upload = $('div.date-chapter-title-rtl').last().text().trim();
    var volumeNumber = '';
    var chapterNumber = '';
    const regex = RegExp(/\b\d+\.?\d?\b/g);

    if (name != null) {
      var numbers = name.match(regex);

      if (numbers != null) {
        if (numbers.length > 0) {
          var indexOfFirstNumber = name.indexOf(numbers[0]);
          var indexOfCh = name.indexOf('Ch');
          var indexOfAllLittleCH = name.indexOf('ch');
          var indexOfAllCapCH = name.indexOf('CH');
          console.log("index of first number -- ", indexOfFirstNumber);

          if (indexOfFirstNumber > indexOfCh && indexOfCh > -1) {
            chapterNumber = numbers[0];
          } else if (indexOfFirstNumber > indexOfAllLittleCH && indexOfAllLittleCH > -1) {
            chapterNumber = numbers[0];
          } else if (indexOfFirstNumber > indexOfAllCapCH && indexOfAllCapCH > -1) {
            chapterNumber = numbers[0];
          } else {
            if (numbers.length > 1) {
              if (name.startsWith('v') || name.startsWith('V')) {
                volumeNumber = numbers[0];
                chapterNumber = numbers[1];
              } else {
                chapterNumber = numbers[0];
              }
            } else {
              chapterNumber = numbers[0];
            }
          }

          if (chapterNumber != '' && numbers.length > 1 && volumeNumber == '') {
            if (name.includes('volume') || name.includes('Volume')) {
              volumeNumber = numbers[1];
            }
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

    return super.chapter(url, "English", volumeNumber, chapterNumber, name, date_upload, scanlator);
  }

  chapterListParse(response, $, seriesURL) {
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

  coverGuess(url, mangaUrl) {
    console.log(url);

    if (url.endsWith("no-image.png")) {
      return `${this.baseUrl}/uploads/manga/${super.substringAfterLast('/', mangaUrl)}/cover/cover_250x350.jpg`;
    } else {
      return url;
    }
  }

  mangaDetailsParse(response, $, seriesURL) {
    console.log("started mangaDetailsParse");

    if ($ == null) {
      $ = cheerio.load(response);
    }

    console.log("mangaDetailsParse loaded into cheerio");
    let title = $('h2.listmanga-header, h2.widget-title').first().text().trim();
    let thumbnai = this.coverGuess($('.row [class^=img-responsive]').attr('src'), seriesURL);
    let author = $(".col-sm-8 dt:contains('Author(s)')").next().text().trim();
    let artist = $(".col-sm-8 dt:contains('Artist(s)')").next().text().trim();
    let status = $(`.col-sm-8 dt:contains('Status')`).next().text().toUpperCase().trim();
    var genres = $('.col-sm-8 dt:contains("Categories")').next().text().trim().replace(/\n/g, '').replace(/\s/g, '').split(/,/g);
    var thumbnail = thumbnai + '?';
    let description = $('.row .well p').text().trim();
    console.log('finishedMangaDetails parse');
    return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
  }

  pageListSelector() {
    return "#all > .img-responsive";
  }

  pageListRequest(chapter) {
    if (chapter.chapter.startsWith('http')) {
      return chapter.chapter;
    } else {
      return super.pageListRequest(chapter);
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
      var url = $(pageElement).attr('data-src').trim();

      if (typeof url === undefined) {
        url = $(pageElement).attr('src').trim();
      }

      var headers = {};
      headers['Referer'] = thisReference.pageListRequest(chapter);
      headers['Content-Type'] = 'image/jpeg';
      pages.push(thisReference.jsonBrowserifyRequest(url, null, null, headers, null));
    });
    console.log('Zahard pages', pages);
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
    console.log("fetchLatestManga -- Zahard");
    var page = parseInt(page);
    var currentPageHtml = await this.send_request(this.latestUpdatesRequest(`${page}`));
    return this.latestUpdatesParse(page, currentPageHtml);
  }

  latestUpdatesParse(page, response) {
    var page = parseInt(page);
    var latestUpdatesSelector = this.latestUpdatesSelector();
    var $ = cheerio.load(response);
    var json = [];
    $(latestUpdatesSelector).each(function (i, elem) {
      var mangaUpdate = new Zahard().latestUpdatesFromElement($(this));
      mangaUpdate.updates = 1;
      json.push(mangaUpdate);
    });
    console.log("Onma latest -- ", json);
    var mangasPage = {};
    mangasPage.mangas = json;
    var lastPageNumber = this.getLastPageNumberForLatest(response, page);
    var hasNextPage = lastPageNumber > page;
    var nextPage = page + 1;
    var results = json.length;

    if (lastPageNumber != null && lastPageNumber > 0) {
      results = results * lastPageNumber;
    }

    return super.mangasPage(json, hasNextPage, nextPage, results);
  }

  async fetchPopularManga(page) {
    console.log(`using default implementation of fetchPopularManga(${page})`);
    var page = parseInt(page);
    console.log("url-- ", this.popularMangaRequest(`${page}`));
    var currentPageHtml = await this.send_request(this.popularMangaRequest(`${page}`));
    return this.popularMangaParse(page, currentPageHtml);
  }

  popularMangaParse(page, response) {
    var page = parseInt(page);
    var $ = cheerio.load(response);
    var json = [];
    var popularMangaSelector = this.popularMangaSelector();
    var thisReference = this;
    $(popularMangaSelector).each(function (i, elem) {
      json.push(thisReference.popularMangaFromElement($(this)));
    });
    var lastPageNumber = this.getLastPageNumberForPopular(response, page);
    var hasNextPage = lastPageNumber > page;
    var nextPage = page + 1;
    var results = json.length;

    if (lastPageNumber != null && lastPageNumber > 0) {
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
    var IgnoreFIl = {};
    IgnoreFIl.paramKey = 'esa';
    IgnoreFIl.displayName = 'NOTE: Using text search will not work it will just ignore it';
    IgnoreFIl.type = 'choice';
    IgnoreFIl.options = {};
    var authorArtistFilter = {};
    authorArtistFilter.paramKey = 'author';
    authorArtistFilter.displayName = 'Author';
    authorArtistFilter.type = 'text';
    var GeneresLISTS = {};
    GeneresLISTS.paramKey = 'category';
    GeneresLISTS.displayName = 'Category';
    GeneresLISTS.type = 'choice';
    GeneresLISTS.options = this.getGenresList();
    var sortFilter = {};
    sortFilter.paramKey = 'sort';
    sortFilter.displayName = 'Sort by';
    sortFilter.type = 'sort';
    sortFilter.options = {};
    sortFilter.options['name'] = 'Name';
    sortFilter.options['views'] = 'Popularity';
    sortFilter.options['last_release'] = 'Last update';
    sortFilter.default = 'name';
    var AlphabetLISTS = {};
    AlphabetLISTS.paramKey = 'alphabet';
    AlphabetLISTS.displayName = 'Begins with';
    AlphabetLISTS.type = 'choice';
    AlphabetLISTS.options = this.getAlphabetList();
    var AscendingLISTS = {};
    AscendingLISTS.paramKey = 'ascending';
    AscendingLISTS.displayName = 'Ascending';
    AscendingLISTS.type = 'choice';
    AscendingLISTS.options = {};
    AscendingLISTS.options['true'] = 'True';
    AscendingLISTS.options['false'] = 'False';
    AscendingLISTS.default = 'false';
    filters.push(IgnoreFIl);
    filters.push(authorArtistFilter);
    filters.push(GeneresLISTS);
    filters.push(sortFilter);
    filters.push(AlphabetLISTS);
    filters.push(AscendingLISTS);
    sourceInfo.filters = filters;
    sourceInfo.displayInfo = [];
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language", ["Arabic"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content", ["Webtoons"], ["#4D83C1"]));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor", ["xOnlyFadi"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker", ["No"], []));
    console.log("Zahard sourceInfo -- ", sourceInfo);
    return sourceInfo;
  }

  searchMangaRequest(page, query, filters) {
    console.log("Zahard filters -- ", filters);
    var query = query.replace(/_/g, "%20");

    if (Object.keys(filters).length === 0) {
      console.log("filters are empty");
      var url = `${this.baseUrl}/search?query=${this.normalizeSearchQuery(query)}`;
      var options = {};
      options = {
        uri: url,
        headers: {
          'Referer': this.baseUrl
        }
      };
      console.log("attempting to fetch search request for Zahard - searchUrl is ", url);
      return options;
    } else {
      console.log("filters has properties");
      var url = `${this.baseUrl}/filterList?page=${page}`;

      for (var i = 0; i < filters.length; i++) {
        switch (filters[i].key) {
          case "category":
            url = super.addQueryParameter(url, "cat", filters[i].value, false);
            break;

          case "alphabet":
            url = super.addQueryParameter(url, "alpha", filters[i].value, false);
            break;

          case "sort":
            url = super.addQueryParameter(url, "sortBy", filters[i].value, false);
            break;

          case "ascending":
            url = super.addQueryParameter(url, "asc", filters[i].value, false);
            break;

          case "author":
            url = super.addQueryParameter(url, "author", filters[i].value, false);
            break;

          default:
            break;
        }
      }

      var options = {};
      options = {
        uri: url,
        headers: {
          'Referer': this.baseUrl
        }
      };
      console.log("attempting to fetch search request for Zahard - searchUrl is ", url);
      return options;
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
    query = query.replace(/ /g, "%20");
    query = query.replace(/%20/g, "%20");
    return query;
  }

  searchMangaParse(page, response, query, filters) {
    if (Object.keys(filters).length === 0) {
      console.log("Zahard filters are empty");
      var page = parseInt(page);
      var $ = cheerio.load(response);
      var body = $("body");
      var searchMangaFromElementJSON = this.searchMangaFromElementJSON(body);
      var page = parseInt(page);
      var mangasPage = {};
      mangasPage.mangas = searchMangaFromElementJSON;
      mangasPage.hasNextPage = 1 > 1;
      mangasPage.nextPage = 1;
      mangasPage.results = 0;
      console.log("mangasPage -- ", mangasPage);
      return mangasPage;
    } else {
      console.log("Zahard Has filters");
      var page = parseInt(page);
      var searchMangaSelector = this.searchMangaSelector();
      var json = [];
      var $ = cheerio.load(response);
      $(searchMangaSelector).each(function (i, elem) {
        json.push(new Zahard().searchMangaFromElement($(this)));
      });
      var page = parseInt(page);
      var lastPageNumber = this.getLastPageNumberForSearch(response, page);
      console.log("lastPageNumber - ", lastPageNumber);
      var mangasPage = {};
      mangasPage.mangas = json;
      mangasPage.hasNextPage = lastPageNumber > page;
      mangasPage.nextPage = page + 1;
      console.log("mangasPage -- ", mangasPage);
      var results = json.length;

      if (lastPageNumber != null && lastPageNumber > 0) {
        results = results * lastPageNumber;
      }

      mangasPage.results = results;
      return mangasPage;
    }
  }

  getGenresList() {
    return {
      "1": "Action",
      "2": "Adventure",
      "3": "Comedy",
      "4": "Doujinshi",
      "5": "Drama",
      "6": "Ecchi",
      "7": "Fantasy",
      "8": "Gender Bender",
      "9": "Harem",
      "10": "Historical",
      "11": "Horror",
      "12": "Josei",
      "13": "Martial Arts",
      "14": "Mature",
      "15": "Mecha",
      "16": "Mystery",
      "17": "One Shot",
      "18": "Psychological",
      "19": "Romance",
      "20": "School Life",
      "21": "Sci-fi",
      "22": "Seinen",
      "23": "Shoujo",
      "24": "Shoujo Ai",
      "25": "Shounen",
      "26": "Shounen Ai",
      "27": "Slice of Life",
      "28": "Sports",
      "29": "Supernatural",
      "30": "Tragedy",
      "31": "Yaoi",
      "32": "Yuri"
    };
  }

  getAlphabetList() {
    return {
      "a": "A",
      "b": "B",
      "c": "C",
      "d": "D",
      "e": "E",
      "f": "F",
      "g": "G",
      "h": "H",
      "i": "I",
      "j": "J",
      "k": "K",
      "l": "L",
      "m": "M",
      "n": "N",
      "o": "O",
      "p": "P",
      "q": "Q",
      "r": "R",
      "s": "S",
      "t": "T",
      "u": "U",
      "v": "V",
      "w": "W",
      "x": "X",
      "y": "Y",
      "z": "Z"
    };
  }

};