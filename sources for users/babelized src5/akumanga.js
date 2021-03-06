'use strict';

const Source = require('./source.js');

var rp = require('request-promise');

var cheerio = require('cheerio');

module.exports = class Akumanga extends Source {
  constructor() {
    super();
    this.baseUrl = 'https://akumanga.com';
  }

  getRequestWithHeaders(method, url) {
    var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0';
    var hosts = this.baseUrl.replace(/^(https?:|)\/\//, '');
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
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    return options;
  }

  GetMangaFormDetails(url, popular, page) {
    var meta_key = '';
    var sidebar = '';

    if (popular) {
      meta_key = '_wp_manga_views';
    } else {
      meta_key = '_latest_update';
    }

    if (popular) {
      sidebar = 'full';
    } else {
      sidebar = 'right';
    }

    var hosts = this.baseUrl.replace(/^(https?:|)\/\//, '');
    var pages = page - 1;
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
    return options;
  }

  searchMangaSelector() {
    return 'div.c-tabs-item__content';
  }

  searchMangaFromElement(element) {
    return this.mangaFromElement(element);
  }

  mangaFromElement(element) {
    var coverElement = element.find('h3 a').first();
    var url = super.substringAfterFirst('.com', 'https:' + coverElement.attr('href'));
    var name = coverElement.text();
    var thumbnai = element.find('img').attr('src');
    var rank = '0';

    if (typeof thumbnai === "undefined") {
      thumbnai = element.find('img').attr('data-src');
    }

    var thumbnail = thumbnai + '?';
    return super.manga(name, url, thumbnail, rank);
  }

  latestUpdatesRequest(page) {
    return this.GetMangaFormDetails(`${this.baseUrl}/wp-admin/admin-ajax.php`, false, page); //headers?
  }

  latestUpdatesSelector() {
    return this.popularMangaSelector();
  }

  latestUpdatesFromElement(element) {
    return this.popularMangaFromElement(element);
  }

  popularMangaRequest(page) {
    return this.GetMangaFormDetails(`${this.baseUrl}/wp-admin/admin-ajax.php`, true, page); //headers?
  }

  popularMangaSelector() {
    return 'div.col-6';
  }

  popularMangaFromElement(element) {
    console.log(element);
    var coverElement = element.find('h3 a').first();
    var url = super.substringAfterFirst('.com', 'https:' + coverElement.attr('href'));
    var name = coverElement.text();
    var thumbnai = element.find('img').attr('src');
    var rank = '0';

    if (typeof thumbnai === "undefined") {
      thumbnai = element.find('img').attr('data-src');
    }

    var thumbnail = thumbnai + '?';
    return super.manga(name, url, thumbnail, rank);
  }

  chapterListSelector() {
    return "li.wp-manga-chapter";
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
    var name = chapterAElement.text().trim();
    var scanlator = "";
    var date_upload = $('span').last().text().trim();
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

    return super.chapter(url, "Arabic", volumeNumber, chapterNumber, name, date_upload, scanlator);
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
    let titl = $('div.post-title h1');
    titl.find("span").remove();
    let title = titl.text().trim();
    let thumbnai = $('div.summary_image img').attr('src');
    let author = $('div.author-content').text().trim();
    let artist = $('div.artist-content').text().trim();
    let status = $('div.post-status div.summary-heading:contains("????????????")').next().text().trim();
    var genres = [];

    if (typeof thumbnai === "undefined") {
      thumbnai = $('div.summary_image img').attr('data-src');
    }

    if (status.includes("????????????")) {
      status = "ONGOING";
    } else if (status.includes("????????????")) {
      status = "COMPLETED";
    } else if (status.includes("??????????")) {
      status = "CANCELED";
    } else if (status.includes("???? ????????????????")) {
      status = "ON HOLD";
    }

    var thumbnail = thumbnai + '?';
    $('div.genres-content a').each(function (i, chapterElement) {
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
      var url = $(pageElement).attr('src');

      if (typeof url === "undefined") {
        url = $('div.summary_image img').attr('data-src');
      }

      var headers = {};
      headers['Referer'] = thisReference.pageListRequest(chapter);
      headers['Content-Type'] = 'image/jpeg';
      pages.push(thisReference.jsonBrowserifyRequest(url.trim(), null, null, headers, null));
    });
    console.log('Akumanga pages', pages);
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
    console.log("fetchLatestManga -- Akumanga");
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
      var mangaUpdate = new Akumanga().latestUpdatesFromElement($(this));
      mangaUpdate.updates = 1;
      json.push(mangaUpdate);
    });
    console.log("Akumanga latest -- ", json);
    var mangasPage = {};
    mangasPage.mangas = json;
    var hasNextPage = json.length >= 20;
    var nextPage = page + 1;
    var results = json.length;

    if (hasNextPage) {
      results = results * 1;
    }

    return super.mangasPage(json, hasNextPage, nextPage, results);
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
    var hasNextPage = json.length >= 20;
    var nextPage = page + 1;
    var results = json.length;

    if (hasNextPage) {
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
    sourceInfo.displayInfo = [];
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language", ["Arabic"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content", ["Manga", "Manhwa", "Manhua"], ["#4D83C1", "#4D83C1", "#4D83C1"]));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor", ["xOnlyFadi"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker", ["No"], []));
    console.log("Akumanga sourceInfo -- ", sourceInfo);
    return sourceInfo;
  }

  searchMangaRequest(page, query, filters) {
    console.log("Akumanga filters -- ", filters);
    var query = query = query.replace(/_/g, "+");

    if (Object.keys(filters).length === 0) {
      console.log("filters are empty");
      var url = this.getRequestWithHeaders("GET", this.baseUrl + `/page/${page}?s=` + this.normalizeSearchQuery(query) + `&post_type=wp-manga`);
      console.log("attempting to fetch search request for Akumanga - searchUrl is ", url);
      return url;
    } else {
      console.log("filters has properties");
      var query = query = query.replace(/_/g, "+");
      var url = `${this.baseUrl}/page/${page}`;

      if (!super.isEmpty(query)) {
        url = super.addQueryParameter(url, "s", this.normalizeSearchQuery(query) + "&post_type=wp-manga", true);
      } else {
        url = super.addQueryParameter(url, "s", "&post_type=wp-manga", true);
      }

      for (var i = 0; i < filters.length; i++) {
        switch (filters[i].key) {
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
            let filtes = encodeURI(filters[i].value);
            let bois = filtes.replace(/,/g, "&genre[]=");
            url = super.addQueryParameter(url, "genre[]", bois, false);
            break;

          default:
            break;
        }
      }

      let finsihedur = this.getRequestWithHeaders("GET", url);
      console.log("attempting to fetch search request for Akumanga - searchUrl is ", finsihedur);
      return finsihedur;
    }
  }

  normalizeSearchQuery(query) {
    var query = query.toLowerCase();
    query = query.replace(/[??????????????????????????????????????????????]+/g, "a");
    query = query.replace(/[??????????????????????????????]+/g, "e");
    query = query.replace(/[????????????]+/g, "i");
    query = query.replace(/[??????????????????????????????????????????????]+/g, "o");
    query = query.replace(/[?????????????????????????????]+/g, "u");
    query = query.replace(/[??????????????]+/g, "y");
    query = query.replace(/[??]+/g, "d");
    query = query.replace(/ /g, "_");
    query = query.replace(/%20/g, "_");
    return query;
  }

  searchMangaParse(page, response, query, filters) {
    var page = parseInt(page);
    var searchMangaSelector = this.searchMangaSelector();
    var json = [];
    var $ = cheerio.load(response);
    $(searchMangaSelector).each(function (i, elem) {
      json.push(new Akumanga().searchMangaFromElement($(this)));
    });
    var page = parseInt(page);
    var mangasPage = {};
    mangasPage.mangas = json;

    if (query.length === 0) {
      mangasPage.hasNextPage = json.length >= 12;
    } else {
      mangasPage.hasNextPage = json.length >= 24;
    }

    mangasPage.nextPage = page + 1;
    var results = json.length;

    if (mangasPage.hasNextPage) {
      results = results * 1;
    }

    mangasPage.results = results;
    console.log("mangasPage -- ", mangasPage);
    return mangasPage;
  }

  getGenresList() {
    return {
      '%d8%a3%d9%83%d8%b4%d9%86': '????????',
      '%d8%a5%d8%ab%d8%a7%d8%b1%d8%a9': '??????????',
      '%d8%a7%d8%ab%d8%a7%d8%b1%d9%87': '??????????',
      '%d8%a7%d9%83%d8%b4%d9%86': '????????',
      '%d8%a7%d9%84%d8%ad%d9%8a%d8%a7%d8%a9-%d8%a7%d9%84%d9%85%d8%af%d8%b1%d8%b3%d9%8a%d8%a9': '???????????? ????????????????',
      '%d8%a7%d9%84%d8%ad%d9%8a%d8%a7%d8%a9-%d8%a7%d9%84%d9%8a%d9%88%d9%85%d9%8a%d8%a9': '???????????? ??????????????',
      '%d8%a7%d9%8a%d8%aa%d8%b4%d9%8a': '??????????',
      '%d8%a7%d9%8a%d8%b3%d9%83%d8%a7%d9%8a': '????????????',
      '%d8%aa%d8%a7%d8%b1%d9%8a%d8%ae%d9%8a': '????????????',
      '%d8%aa%d9%86%d8%a7%d8%b3%d8%ae': '??????????',
      '%d8%ac%d8%b2%d8%a1-%d9%85%d9%86-%d8%a7%d9%84%d8%ad%d9%8a%d8%a7%d8%a9': '?????? ???? ????????????',
      '%d8%ac%d9%88%d8%b3%d9%8a': '????????',
      '%d8%ad%d8%b1%d9%8a%d9%85': '????????',
      '%d8%ad%d9%8a%d8%a7%d8%a9-%d9%85%d8%af%d8%b1%d8%b3%d9%8a%d8%a9': '???????? ????????????',
      '%d8%ae%d8%a7%d8%b1%d9%82-%d9%84%d9%84%d8%b7%d8%a8%d9%8a%d8%b9%d8%a9': '???????? ??????????????',
      '%d8%ae%d8%a7%d8%b1%d9%82-%d9%84%d9%84%d8%b7%d8%a8%d9%8a%d8%b9%d9%87': '???????? ??????????????',
      '%d8%ae%d9%8a%d8%a7%d9%84': '????????',
      '%d8%ae%d9%8a%d8%a7%d9%84-%d8%b9%d9%84%d9%85%d9%8a': '???????? ????????',
      '%d8%af%d8%b1%d8%a7%d9%85%d8%a7': '??????????',
      '%d8%b1%d8%a7%d8%b4%d8%af': '????????',
      '%d8%b1%d8%b9%d8%a8': '??????',
      '%d8%b1%d9%88%d9%85%d8%a7%d9%86%d8%b3%d9%89': '??????????????',
      '%d8%b1%d9%88%d9%85%d8%a7%d9%86%d8%b3%d9%8a': '??????????????',
      '%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a': '??????????',
      '%d8%b2%d9%85%d9%83%d8%a7%d9%86%d9%89': '????????????',
      '%d8%b2%d9%85%d9%83%d8%a7%d9%86%d9%8a': '????????????',
      '%d8%b2%d9%88%d9%85%d8%a8%d9%8a': '??????????',
      '%d8%b3%d8%ad%d8%b1': '??????',
      '%d8%b3%d9%8a%d9%86%d9%8a%d9%86': '??????????',
      '%d8%b4%d8%b1%d9%8a%d8%ad%d8%a9-%d9%85%d9%86-%d8%a7%d9%84%d8%ad%d9%8a%d8%a7%d8%a9': '?????????? ???? ????????????',
      '%d8%b4%d9%88%d8%ac%d9%88': '????????',
      '%d8%b4%d9%88%d9%86%d9%8a%d9%86': '??????????',
      '%d8%b4%d9%8a%d8%a7%d8%b7%d9%8a%d9%86': '????????????',
      '%d8%b7%d8%a8%d8%ae': '??????',
      '%d8%b9%d8%b3%d9%83%d8%b1%d9%8a': '??????????',
      '%d8%ba%d9%85%d9%88%d8%b6': '????????',
      '%d9%81%d9%86%d9%88%d9%86-%d9%82%d8%aa%d8%a7%d9%84%d9%8a%d8%a9': '???????? ????????????',
      '%d9%81%d9%86%d9%88%d9%86-%d9%82%d8%aa%d8%a7%d9%84%d9%8a%d9%87': '???????? ????????????',
      '%d9%82%d9%88%d8%a9-%d8%ae%d8%a7%d8%b1%d9%82%d8%a9': '?????? ??????????',
      '%d9%83%d9%88%d9%85%d9%8a%d8%af%d9%89': '????????????',
      '%d9%83%d9%88%d9%85%d9%8a%d8%af%d9%8a': '????????????',
      '%d9%83%d9%88%d9%85%d9%8a%d8%af%d9%8a%d8%a7': '??????????????',
      '%d9%84%d8%b9%d8%a8%d8%a9': '????????',
      '%d9%85%d8%a3%d8%b3%d8%a7%d8%a9': '??????????',
      '%d9%85%d8%a7%d9%86%d9%87%d8%a7': '??????????',
      '%d9%85%d8%a7%d9%86%d9%87%d9%88%d8%a7': '????????????',
      '%d9%85%d8%a7%d9%86%d9%87%d9%88%d8%a7-%d9%83%d9%88%d8%b1%d9%8a%d8%a9': '???????????? ??????????',
      '%d9%85%d8%ba%d8%a7%d9%85%d8%b1%d8%a7%d8%aa': '??????????????',
      '%d9%85%d8%ba%d8%a7%d9%85%d8%b1%d8%a9': '????????????',
      '%d9%86%d9%81%d8%b3%d9%8a': '????????',
      '%d9%88%d8%ad%d9%88%d8%b4': '????????',
      '%d9%88%d9%8a%d8%a8-%d8%aa%d9%88%d9%86%d8%b2': '?????? ????????',
      '%d9%88%d9%8a%d8%a8%d8%aa%d9%88%d9%86': '????????????',
      '%d9%8a%d9%88%d8%b1%d9%8a-%d8%ae%d9%81%d9%8a%d9%81': '???????? ????????'
    };
  }

};