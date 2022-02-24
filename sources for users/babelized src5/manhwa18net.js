'use strict';

const Source = require('./source.js');

var rp = require('request-promise');

var cheerio = require('cheerio');

module.exports = class Manhwa18Net extends Source {
  constructor() {
    super();
    this.baseUrl = 'https://manhwa18.net';
  }

  searchMangaSelector() {
    return this.popularMangaSelector();
  }

  getRequestWithHeaders(url) {
    var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64) Gecko/20100101 Firefox/77.0';
    var options = {
      method: 'GET',
      url: url,
      headers: {
        'User-Agent': userAgent,
        'Refer': this.baseUrl
      }
    };
    return options;
  }

  getImgAttr(element) {
    if (element.attr('data-original') !== undefined) {
      return element.attr('data-original');
    } else if (element.attr('data-src') !== undefined) {
      return element.attr('data-src');
    } else if (element.attr('data-bg') !== undefined) {
      return element.attr('data-bg');
    } else if (element.attr('data-srcset') !== undefined) {
      return element.attr('data-srcset');
    } else {
      return element.attr('src');
    }
  }

  mangaFromElement(element) {
    var coverElement = element.find('h3 a, .series-title a').first();
    var url = coverElement.attr('href');
    var name = coverElement.text();
    var thumbnail = this.getImgAttr(element.find('img, .thumb-wrapper .img-in-ratio'));
    var rank = '0';
    return super.manga(name, '/' + url, "https://manhwa18.net" + thumbnail, rank);
  }

  latestUpdatesRequest(page) {
    return this.getRequestWithHeaders(`${this.baseUrl}/manga-list.html?listType=pagination&page=${page}&sort=last_update&sort_type=DESC`);
  }

  latestUpdatesSelector() {
    return this.popularMangaSelector();
  }

  popularMangaRequest(page) {
    return this.getRequestWithHeaders(`${this.baseUrl}/manga-list.html?listType=pagination&page=${page}&sort=views&sort_type=DESC`);
  }

  popularMangaSelector() {
    return 'div.media, .thumb-item-flow';
  }

  getLastPageNumber(firstPageHtml) {
    var $ = cheerio.load(firstPageHtml);
    var nextPage = $('div.col-lg-9 button.btn-info, .pagination a:contains(»):not(.disabled)');

    if (nextPage.contents().length !== 0) {
      return true;
    } else {
      return false;
    }
  }

  chapterListSelector() {
    return "div#list-chapters p, table.table tr, .list-chapters > a";
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

  chapterFromElement(chapterElement, mangaTitle) {
    var $ = cheerio.load(chapterElement);
    var chapterAElement = $('a');
    var url = chapterAElement.attr('href');
    var name = $('li div.chapter-name').text().trim();
    var scanlator = "";
    var date_upload = $('time, .chapter-time, .publishedDate').text();
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

    return super.chapter('/' + url, "English", volumeNumber, chapterNumber, name, date_upload, scanlator);
  }

  chapterListParse(response, $, seriesURL) {
    console.log("started chapterListParse");

    if ($ == null) {
      $ = cheerio.load(response);
    }

    console.log("chapterListParse loaded into cheerio");
    var thisReference = this;
    var chapters = [];
    var mangaTitle = $(".manga-info h1, .manga-info h3").text();
    $(this.chapterListSelector()).each(function (i, chapterElement) {
      var chapter = thisReference.chapterFromElement(chapterElement, mangaTitle);
      chapters.push(chapter);
    });
    console.log("chapterListParse finished");
    return chapters;
  }

  mangaDetailsParse(response, $, seriesURL) {
    console.log("started mangaDetailsParse");

    if ($ == null) {
      $ = cheerio.load(response);
    }

    console.log("mangaDetailsParse loaded into cheerio");
    let title = $('ul.manga-info h3').first().text().trim();
    let thumbnail = this.getImgAttr($('img.thumbnail'));
    let author = $('li a.btn-info').contents().toArray().map(element => element.type === 'text' ? $(element).text().trim() : null).filter(text => text).join(', ').replace(/Updating/g, 'Unknown');
    let artist = author;
    let status = $('li a.btn-success').text().toUpperCase().trim().replace(/on going/gi, 'ONGOING');
    var genres = [];
    $('li a.btn-danger').each(function (i, chapterElement) {
      var gen = $(chapterElement).text();
      genres.push(gen);
    });
    let description = $('div.detail .content, div.row ~ div.row:has(h3:first-child) p, .summary-content p').text().trim();
    console.log('finishedMangaDetails parse');
    return this.mangaDetails(title, "https://manhwa18.net" + thumbnail, description, author, artist, status, genres);
  }

  pageListSelector() {
    return "img.chapter-img";
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
      var url = thisReference.getImgAttr($(pageElement));
      var headers = {};
      headers['Referer'] = thisReference.pageListRequest(chapter);
      headers['Content-Type'] = 'image/jpeg';
      pages.push(thisReference.jsonBrowserifyRequest(url, null, null, headers, null));
    });
    console.log('Manhwa18Net pages', pages);
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
    console.log("fetchLatestManga -- Manhwa18Net");
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
      var mangaUpdate = new Manhwa18Net().mangaFromElement($(this));
      mangaUpdate.updates = 1;
      json.push(mangaUpdate);
    });
    var mangasPage = {};
    mangasPage.mangas = json;
    var hasNextPage = this.getLastPageNumber(response);
    var nextPage = page + 1;
    var results = json.length;
    console.log("Manhwa18Net latest -- ", json);
    return super.mangasPage(json, hasNextPage, nextPage, results);
  }

  popularMangaParse(page, response) {
    var page = parseInt(page);
    var $ = cheerio.load(response);
    var json = [];
    var popularMangaSelector = this.popularMangaSelector();
    var thisReference = this;
    $(popularMangaSelector).each(function (i, elem) {
      json.push(thisReference.mangaFromElement($(this)));
    });
    var hasNextPage = this.getLastPageNumber(response);
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
    var IgnoreFIl11 = {};
    IgnoreFIl11.paramKey = 'esa';
    IgnoreFIl11.displayName = 'For right now filters are disabled inside the';
    IgnoreFIl11.type = 'choice';
    IgnoreFIl11.options = {};
    filters.push(IgnoreFIl11);
    sourceInfo.filters = filters;
    sourceInfo.displayInfo = [];
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language", ["English"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content", ["Manwha", "Adult"], ["#4D83C1", "#ff1100"]));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor", ["xOnlyFadi"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("note", ["Advanced Search is removed until further notice"], ["#ff1100"]));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker", ["No"], []));
    console.log("Manhwa18Net sourceInfo -- ", sourceInfo);
    return sourceInfo;
  }

  searchMangaRequest(page, query, filters) {
    console.log("Manhwa18Net filters -- ", filters);
    var query = query = query.replace(/_/g, "+");

    if (Object.keys(filters).length === 0) {
      console.log("filters are empty");
      var url = this.getRequestWithHeaders(`${this.baseUrl}/manga-list.html?name=${this.normalizeSearchQuery(query)}&page=${page}`);
      console.log("attempting to fetch search request for Manhwa18Net - searchUrl is ", url);
      return url;
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
    return query;
  }

  searchMangaParse(page, response, query, filters) {
    var page = parseInt(page);
    var searchMangaSelector = this.searchMangaSelector();
    var json = [];
    var $ = cheerio.load(response);
    $(searchMangaSelector).each(function (i, elem) {
      json.push(new Manhwa18Net().mangaFromElement($(this)));
    });
    var page = parseInt(page);
    var mangasPage = {};
    mangasPage.mangas = json;
    mangasPage.hasNextPage = json.length >= 20;
    mangasPage.nextPage = page + 1;
    mangasPage.results = json.length;
    console.log("mangasPage -- ", mangasPage);
    return mangasPage;
  }

};