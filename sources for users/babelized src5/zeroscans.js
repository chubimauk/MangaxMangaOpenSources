'use strict';

const Source = require('./source.js');

var rp = require('request-promise');

var cheerio = require('cheerio');

var mangaUrlDirectory = '/comics';
module.exports = class ZeroScans extends Source {
  constructor() {
    super();
    this.baseUrl = 'https://zeroscans.com';
  }

  getImageSrc(imageObj, baseUrl) {
    let trimmedLink = imageObj.attr('style').split('(')[1].split(')')[0];
    let isFullLink = trimmedLink.startsWith('http');
    let image = isFullLink ? trimmedLink : baseUrl + trimmedLink;

    if (typeof image != 'undefined') {
      return image;
    } else {
      return '';
    }
  }

  searchMangaSelector() {
    return this.popularMangaSelector();
  }

  searchMangaFromElement(element) {
    return this.mangaFromElement(element);
  }

  mangaFromElement(element) {
    var coverElement = element.find('a.list-title');
    var url = super.substringAfterFirst('.com', coverElement.attr('href'));
    var name = coverElement.text().trim();
    var thumbnail = this.getImageSrc(element.find('a.media-content'), this.baseUrl);
    var rank = '0';
    return super.manga(name, url, thumbnail, rank);
  }

  latestUpdatesRequest(page) {
    return `${this.baseUrl}/latest?page=${page}`;
  }

  latestUpdatesSelector() {
    return this.popularMangaSelector();
  }

  latestUpdatesFromElement(element) {
    return this.mangaFromElement(element);
  }

  popularMangaRequest(page) {
    return `${this.baseUrl}${mangaUrlDirectory}?page=${page}`;
  }

  popularMangaSelector() {
    return "div.list-item";
  }

  popularMangaFromElement(element) {
    return this.mangaFromElement(element);
  }

  searchMangaNextPageSelector(firstPageHtml) {
    var $ = cheerio.load(firstPageHtml);
    var nextPage = $('[rel=next]');

    if (nextPage.contents().length !== 0) {
      return true;
    } else {
      return false;
    }
  }

  chapterListSelector() {
    return "div.col-lg-9 div.flex";
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
    var urlElement = $("a.item-author");
    var url = super.substringAfterFirst(this.baseUrl, urlElement.attr('href'));
    var name = '';
    var scanlator = "";
    var date_upload = $("a.item-company").first().text().trim();
    var chapterNumber = urlElement.attr('href').split('/').pop();
    var volumeNumber = '';

    if (urlElement.text().includes(`Chapter ${volumeNumber}`)) {
      name = urlElement.text().trim();
      console.log('2');
    } else {
      name = `Ch. ${chapterNumber}: ${urlElement.text().trim()}`;
      console.log('1');
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

  mangaDetailsParse(response, $, seriesURL) {
    console.log("started mangaDetailsParse");

    if ($ == null) {
      $ = cheerio.load(response);
    }

    console.log("mangaDetailsParse loaded into cheerio");
    let title = $("div#content h5").first().text().trim();
    let thumbnail = this.getImageSrc($("div.media a").first(), this.baseUrl);
    let author = "";
    let artist = "";
    let status = "ONGOING";
    var genres = [];
    let description = $("div.col-lg-9").text().split("Description\n")[1].split("Volume")[0].trim();
    console.log('finishedMangaDetails parse');
    return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
  }

  pageListSelector() {
    return "div#vungdoc img, div.container-chapter-reader img";
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
    let scriptObj = $('div#pages-container + script').toArray();
    let allPages = scriptObj[0].children[0].data.split('[')[1].split('];')[0].replace(/["\\]/g, '').split(',');
    let pages = [];

    for (let obj of allPages) {
      let page = encodeURI(obj);
      page = page.startsWith('http') ? page : this.baseUrl + page;
      var headers = {};
      headers['Referer'] = this.pageListRequest(chapter);
      headers['Content-Type'] = 'image/jpeg';
      pages.push(this.jsonBrowserifyRequest(page, null, null, headers, null));
    }

    console.log('ZeroScans pages', pages);
    return pages;
  }

  async fetchLatestManga(page) {
    console.log("fetchLatestManga -- ZeroScans");
    var page = parseInt(page);
    var currentPageHtml = await this.send_request(this.latestUpdatesRequest(`${page}`));
    return this.latestUpdatesParse(page, currentPageHtml);
  }

  latestUpdatesParse(page, response) {
    var $ = cheerio.load(response);
    var json = [];
    $(this.latestUpdatesSelector()).each(function (i, elem) {
      var mangaUpdate = new ZeroScans().latestUpdatesFromElement($(this));
      mangaUpdate.updates = 1;
      json.push(mangaUpdate);
    });
    var mangasPage = {};
    mangasPage.mangas = json;
    var hasNextPage = this.searchMangaNextPageSelector(response);
    var nextPage = page + 1;
    var results = json.length;
    console.log("ZeroScans latest -- ", json);
    return super.mangasPage(json, hasNextPage, nextPage, results);
  }

  popularMangaParse(page, response) {
    var $ = cheerio.load(response);
    var json = [];
    var thisReference = this;
    $(this.popularMangaSelector()).each(function (i, elem) {
      json.push(thisReference.popularMangaFromElement($(this)));
    });
    var hasNextPage = this.searchMangaNextPageSelector(response);
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
    sourceInfo.filters = filters;
    sourceInfo.displayInfo = [];
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language", ["English"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content", ["Manwha", "Manhua"], ["#4D83C1", "#4D83C1"]));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor", ["xOnlyFadi"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("note", ["High Quality Scans"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker", ["No"], []));
    console.log("ZeroScans sourceInfo -- ", sourceInfo);
    return sourceInfo;
  }

  searchMangaRequest(page, query, filters) {
    return `${this.baseUrl}${mangaUrlDirectory}?page=${this.normalizeSearchQuery(query)}`;
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
      json.push(new ZeroScans().searchMangaFromElement($(this)));
    });
    var mangasPage = {};
    mangasPage.mangas = json;
    mangasPage.hasNextPage = false;
    mangasPage.nextPage = 0;
    mangasPage.results = json.length;
    console.log("mangasPage -- ", mangasPage);
    return mangasPage;
  }

};