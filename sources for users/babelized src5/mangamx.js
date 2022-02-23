'use strict';

const Source = require('./source.js');

var rp = require('request-promise');

var cheerio = require('cheerio');

var csrfToken = '';
module.exports = class MangaMx extends Source {
  constructor() {
    super();
    this.baseUrl = 'https://manga-mx.com';
  }

  getRequestWithHeaders(method, url) {
    var options = {
      'method': method,
      'url': url,
      'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0'
      }
    };
    return options;
  }

  searchMangaFromElementJSON(element) {
    console.log(element);
    const obj = JSON.parse(element);
    const allMangas = [];

    for (var vals in obj.mangas) {
      var url = super.substringAfterFirst('.com', obj.mangas[vals].url);
      var name = obj.mangas[vals].nombre;
      var thumbnail = obj.mangas[vals].img.replace("/thumb", "/cover");
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

  searchMangaSelector() {
    return this.popularMangaSelector();
  }

  searchMangaFromElement(element) {
    return this.mangaFromElement(element);
  }

  mangaFromElement(element) {
    var url = super.substringAfterFirst('.com', 'https:' + element.attr('href'));
    var name = element.find('div').eq(1).text().trim();
    var thumbnail = element.find('img').attr('data-src');
    var rank = '0';
    return super.manga(name, url, thumbnail, rank);
  }

  latestUpdatesRequest(page) {
    return this.getRequestWithHeaders("GET", `${this.baseUrl}/recientes?p=${page}`);
  }

  latestUpdatesSelector() {
    return 'div._1bJU3';
  }

  latestUpdatesFromElement(element) {
    var coverElement = element.find('div a');
    var url = super.substringAfterFirst('.com', 'https:' + coverElement.attr('href'));
    var name = coverElement.text().trim();
    var thumbnail = element.find('img').attr('data-src');
    var rank = '0';
    return super.manga(name, url, thumbnail, rank);
  }

  popularMangaRequest(page) {
    return this.getRequestWithHeaders("GET", `${this.baseUrl}/directorio?genero=false&estado=false&filtro=visitas&tipo=false&adulto=false&orden=desc&p=${page}`);
  }

  popularMangaSelector() {
    return '#article-div a';
  }

  popularMangaFromElement(element) {
    return this.mangaFromElement(element);
  }

  getLastPageNumber(firstPageHtml, page) {
    var $ = cheerio.load(firstPageHtml);
    var lastPageHREFText = $('.page-item a[rel=next]').attr('href');

    if (lastPageHREFText === undefined) {
      return parseInt(page);
    } else {
      var lastNumbersOnly = lastPageHREFText.match(/\d/g);
      var lastNumber = 0;

      if (lastNumbersOnly != null && lastNumbersOnly.length > 0) {
        lastNumber = lastNumbersOnly.join('');
      }

      return parseInt(lastNumber);
    }
  }

  chapterListSelector() {
    return "div#c_list a";
  }

  chapterListRequest(seriesURL) {
    if (seriesURL.startsWith('http')) {
      return this.getRequestWithHeaders("GET", seriesURL);
    } else {
      return this.getRequestWithHeaders("GET", super.chapterListRequest(seriesURL));
    }
  }

  mangaDetailsRequest(seriesURL) {
    if (seriesURL.startsWith('http')) {
      return this.getRequestWithHeaders("GET", seriesURL);
    } else {
      return this.getRequestWithHeaders("GET", super.mangaDetailsRequest(seriesURL));
    }
  }

  chapterFromElement(chapterElement, source) {
    var $ = cheerio.load(chapterElement);
    var chapterAElement = $('a');
    var url = super.substringAfterFirst(this.baseUrl, chapterAElement.attr('href'));
    var name = chapterAElement.text();
    var scanlator = "";
    var date_upload = $('span').attr('datetime');
    var volumeNumber = '';
    var chapterNumber = $('span').attr('data-num');
    const regex = RegExp(/\b\d+\.?\d?\b/g);

    if (chapterNumber === "undefined") {
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
    } else {
      chapterNumber = chapterNumber;
    }

    return super.chapter(url, "Spanish", volumeNumber, chapterNumber, name, date_upload, scanlator);
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
    let title = $('h1.post-title a').text().trim();
    let thumbnai = $('img[src*=cover]').attr('src');
    let author = $('div#info-i').text().trim();

    if (author.includes("Autor")) {
      let au = super.substringAfterFirst('Autor:', author);
      author = super.substringBeforeFirst('Fecha:', au).trim();
    }

    let artist = author;
    let status = $('span#desarrollo').text().toUpperCase().trim().replace(/EN DESARROLLO/g, 'ONGOING');
    var genres = [];
    var thumbnail = thumbnai + '?';
    $('div#categ a').each(function (i, chapterElement) {
      var gen = $(chapterElement).text();
      genres.push(gen);
    });
    let description = $('div#sinopsis').last().text().trim().replace(/Sinopsis\n/g, '');
    console.log('finishedMangaDetails parse');
    return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
  }

  pageListSelector() {
    return "div#vungdoc img, div.container-chapter-reader img";
  }

  pageListRequest(chapter) {
    if (chapter.chapter.startsWith('http')) {
      return this.getRequestWithHeaders("GET", chapter.chapter);
    } else {
      return this.getRequestWithHeaders("GET", super.pageListRequest(chapter));
    }
  }

  async fetchPageList(chapter) {
    var pageListResponse = await this.send_request(this.pageListRequest(chapter));
    return this.pageListParse(pageListResponse, chapter);
  }

  findTextAndReturnRemainder(target, variable) {
    var chopFront = target.substring(target.search(variable) + variable.length, target.length);
    var result = chopFront.substring(0, chopFront.search(";"));
    return result;
  }

  reverseString(str) {
    var string = str;
    return string.split('').reverse().join('');
  }

  pageListParse(pageListResponse, chapter) {
    var $ = cheerio.load(pageListResponse);
    var thisReference = this;
    var pages = [];
    const txt = $('script:contains(unicap)').html();
    const matchX = this.findTextAndReturnRemainder(txt, 'var unicap =');
    var decoded = new Buffer.from(this.reverseString(matchX), 'base64').toString('utf-8');
    var url = super.substringBeforeFirst('||', decoded);
    let rmfs = super.substringAfterFirst('[', decoded);
    super.substringBeforeFirst(']', rmfs).split(',').map((currElement, index) => {
      var page = `${url}${currElement}`;
      var headers = {};
      headers['Referer'] = thisReference.pageListRequest(chapter);
      headers['Content-Type'] = 'image/jpeg';
      pages.push(thisReference.jsonBrowserifyRequest(page.replace(/"/g, ''), null, null, headers, null));
    });
    console.log('MangaMx pages', pages);
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
    console.log("fetchLatestManga -- MangaMx");
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
      var mangaUpdate = new MangaMx().latestUpdatesFromElement($(this));
      mangaUpdate.updates = 1;
      json.push(mangaUpdate);
    });
    var mangasPage = {};
    mangasPage.mangas = json;
    var lastPageNumber = this.getLastPageNumber(response, page);
    var hasNextPage = lastPageNumber > page;
    var nextPage = page + 1;
    var results = json.length;

    if (lastPageNumber != null && lastPageNumber > 0) {
      results = results * lastPageNumber;
    }

    console.log("MangaMx latest -- ", json);
    return super.mangasPage(json, hasNextPage, nextPage, results);
  }

  popularMangaParse(page, response) {
    var page = parseInt(page);
    var $ = cheerio.load(response);
    csrfToken = $('meta[name=csrf-token]').attr('content');
    var json = [];
    var popularMangaSelector = this.popularMangaSelector();
    var thisReference = this;
    $(popularMangaSelector).each(function (i, elem) {
      json.push(thisReference.popularMangaFromElement($(this)));
    });
    var lastPageNumber = this.getLastPageNumber(response, page);
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
    var sortFilter = {};
    sortFilter.paramKey = 'sort';
    sortFilter.displayName = 'Ordenar por';
    sortFilter.type = 'sort';
    sortFilter.options = {};
    sortFilter.options['visitas'] = 'Visitas';
    sortFilter.options['id'] = 'Recientes';
    sortFilter.options['nombre'] = 'Alfabético';
    sortFilter.default = 'id';
    var statusFilter = {};
    statusFilter.paramKey = 'status';
    statusFilter.displayName = 'Estado';
    statusFilter.type = 'choice';
    statusFilter.options = {};
    statusFilter.options['false'] = 'Estado';
    statusFilter.options['1'] = 'En desarrollo';
    statusFilter.options['0'] = 'Completo';
    statusFilter.default = 'false';
    var typedFilter = {};
    typedFilter.paramKey = 'type';
    typedFilter.displayName = 'Tipo';
    typedFilter.type = 'choice';
    typedFilter.options = {};
    typedFilter.options['end'] = 'Todo';
    typedFilter.options['on-going'] = 'Mangas';
    typedFilter.options['canceled'] = 'Manhwas';
    typedFilter.options['end'] = 'One Shot';
    typedFilter.options['on-going'] = 'Manhuas';
    typedFilter.options['canceled'] = 'Novelas';
    typedFilter.default = 'end';
    var GeneresLISTS = {};
    GeneresLISTS.paramKey = 'genres';
    GeneresLISTS.displayName = 'Generos';
    GeneresLISTS.type = 'tag';
    GeneresLISTS.options = this.getGenresList();
    GeneresLISTS.default = 'false';
    filters.push(sortFilter);
    filters.push(statusFilter);
    filters.push(typedFilter);
    filters.push(GeneresLISTS);
    sourceInfo.filters = filters;
    sourceInfo.displayInfo = [];
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language", ["Spanish"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content", ["Manga", "Manwha", "Manhua", "Adult"], ["#4D83C1", "#4D83C1", "#4D83C1", "#ff1100"]));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor", ["xOnlyFadi"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("note", ["Algunas páginas del sitio tardan en cargarse"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker", ["No"], []));
    console.log("MangaMx sourceInfo -- ", sourceInfo);
    return sourceInfo;
  }

  searchMangaRequest(page, query, filters) {
    console.log("MangaMx filters -- ", filters);

    if (Object.keys(filters).length === 0) {
      var options = {
        'method': 'POST',
        'url': `${this.baseUrl}/buscar`,
        'headers': {
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://manga-mx.com',
          'Alt-Used': 'manga-mx.com',
          'Referer': 'https://manga-mx.com/'
        },
        body: `buscar=${query}&_token=${csrfToken}`
      };
      console.log("attempting to fetch search request for MangaMx - searchUrl is ", options);
      return options;
    } else {
      console.log("filters has properties");
      var url = `${this.baseUrl}/directorio`;
      url = super.addQueryParameter(url, "adulto", "1", true);

      for (var i = 0; i < filters.length; i++) {
        switch (filters[i].key) {
          case "status":
            url = super.addQueryParameter(url, "estado", filters[i].value, false);
            break;

          case "sort":
            url = super.addQueryParameter(url, "filtro", filters[i].value, false);

            if (filters[i].direction == "asc") {
              url += '&orden=asc';
            } else if (filters[i].direction == "desc") {
              url += '&orden=desc';
            }

            break;

          case "type":
            url = super.addQueryParameter(url, "tipo", filters[i].value, false);
            break;

          case "genres":
            url = super.addQueryParameter(url, "genero", filters[i].value, false);
            break;

          default:
            break;
        }
      }

      console.log("attempting to fetch search request for MangaMx - searchUrl is ", url);
      return this.getRequestWithHeaders("GET", url);
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
    if (Object.keys(filters).length === 0) {
      var page = parseInt(page);
      var searchMangaFromElementJSON = this.searchMangaFromElementJSON(response);
      var page = parseInt(page);
      var mangasPage = {};
      mangasPage.mangas = searchMangaFromElementJSON;
      mangasPage.hasNextPage = 1 > 1;
      mangasPage.nextPage = 1;
      mangasPage.results = 0;
      console.log("mangasPage -- ", mangasPage);
      return mangasPage;
    } else {
      var page = parseInt(page);
      var searchMangaSelector = this.searchMangaSelector();
      var json = [];
      var $ = cheerio.load(response);
      $(searchMangaSelector).each(function (i, elem) {
        json.push(new MangaMx().searchMangaFromElement($(this)));
      });
      var page = parseInt(page);
      var lastPageNumber = this.getLastPageNumber(response, page);
      console.log("lastPageNumber - ", lastPageNumber);
      var mangasPage = {};
      mangasPage.mangas = json;
      mangasPage.hasNextPage = lastPageNumber > page;
      mangasPage.nextPage = page + 1;
      var results = json.length;

      if (lastPageNumber != null && lastPageNumber > 0) {
        results = results * lastPageNumber;
      }

      mangasPage.results = results;
      console.log("mangasPage -- ", mangasPage);
      return mangasPage;
    }
  }

  getGenresList() {
    return {
      "false": "Todos",
      "1": "Comedia",
      "2": "Drama",
      "3": "Acción",
      "4": "Escolar",
      "5": "Romance",
      "6": "Ecchi",
      "7": "Aventura",
      "8": "Shōnen",
      "9": "Shōjo",
      "10": "Deportes",
      "11": "Psicológico",
      "12": "Fantasía",
      "13": "Mecha",
      "14": "Gore",
      "15": "Yaoi",
      "16": "Yuri",
      "17": "Misterio",
      "18": "Sobrenatural",
      "19": "Seinen",
      "20": "Ficción",
      "21": "Harem",
      "25": "Webtoon",
      "27": "Histórico",
      "30": "Músical",
      "31": "Ciencia ficción",
      "32": "Shōjo-ai",
      "33": "Josei",
      "34": "Magia",
      "35": "Artes Marciales",
      "36": "Horror",
      "37": "Demonios",
      "38": "Supervivencia",
      "39": "Recuentos de la vida",
      "40": "Shōnen ai",
      "41": "Militar",
      "42": "Eroge",
      "43": "Isekai"
    };
  }

};