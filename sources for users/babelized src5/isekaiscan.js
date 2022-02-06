'use strict';

const Source = require('./source.js');

var rp = require('request-promise');

var cheerio = require('cheerio');

module.exports = class Isekaiscan extends Source {
  constructor() {
    super();
    this.baseUrl = 'https://isekaiscan.com';
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,image/jpg,image/png,image/webp',
        'Accept-Language': 'en-us',
        'Connection': 'keep-alive',
        'X-Requested-With': 'XMLHttpRequest'
      },
      agentOptions: {
        ciphers: 'AES256-SHA'
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

    var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0';
    var hosts = this.baseUrl.replace(/^(https?:|)\/\//, '');
    var pages = page - 1;
    var options = {
      'method': 'POST',
      'url': url,
      'headers': {
        'Host': hosts,
        'User-Agent': userAgent,
        'Referer': this.baseUrl,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      form: {
        'action': 'madara_load_more',
        'page': `${pages}`,
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
      },
      agentOptions: {
        ciphers: 'AES256-SHA'
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
    var thumbnai = element.find('img').attr('data-src');
    var rank = '0';

    if (typeof thumbnai === undefined) {
      thumbnai = element.find('img').attr('src');
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
    return this.mangaFromElement(element);
  }

  popularMangaRequest(page) {
    return this.GetMangaFormDetails(`${this.baseUrl}/wp-admin/admin-ajax.php`, true, page); //headers?
  }

  popularMangaSelector() {
    return 'div.page-item-detail:not(:has(a[href*="bilibilicomics.com"]))';
  }

  popularMangaFromElement(element) {
    return this.mangaFromElement(element);
  }

  searchMangaNextPageSelector(firstPageHtml) {
    var $ = cheerio.load(firstPageHtml);
    var nextPage = $('div.nav-previous, nav.navigation-ajax, a.nextpostslink');

    if (nextPage.contents().length !== 0) {
      return true;
    } else {
      return false;
    }
  }

  chapterListSelector() {
    return "li.wp-manga-chapter";
  }

  chapterListRequest(method, seriesURL) {
    if (seriesURL.startsWith('http')) {
      return this.getRequestWithHeaders(method, seriesURL);
    } else {
      return this.getRequestWithHeaders(method, super.chapterListRequest(seriesURL));
    }
  }

  mangaDetailsRequest(method, seriesURL) {
    if (seriesURL.startsWith('http')) {
      return this.getRequestWithHeaders(method, seriesURL);
    } else {
      return this.getRequestWithHeaders(method, super.mangaDetailsRequest(seriesURL));
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
    console.log("chapterListParse finished");
    var chaptersPage = {};
    chaptersPage.chapters = response;
    chaptersPage.hasNextPage = false;
    chaptersPage.nextPage = 0;
    return chaptersPage;
  }

  mangaDetailsMainSelector() {
    return 'div.col-sm-12';
  }

  descriptionSelector() {
    return "div.description-summary div.summary__content";
  }

  thumbnailSelector() {
    return "div.summary_image img";
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
    let thumbnai = $('div.summary_image img').attr('data-src');
    let author = $('div.author-content').text().trim();
    let artist = $('div.artist-content').text().trim();
    let status = $('div.post-status div.summary-heading:contains("Status")').next().text().toUpperCase().trim();
    var genres = [];

    if (typeof thumbnai === undefined) {
      thumbnai = $('div.summary_image img').attr('src');
    }

    var thumbnail = thumbnai + '?';
    $('div.genres-content a').each(function (i, chapterElement) {
      var gen = $(chapterElement).text();
      genres.push(gen);
    });
    let description = $('div.description-summary div.summary__content').text().trim();
    console.log('finishedMangaDetails parse');
    var responseData = {};
    responseData.mangaDetails = this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    responseData.currentPage = '0';
    responseData.hasNextPage = true;
    responseData.totalChapters = '0';
    var nextRequest = this.mangaDetailsRequest('POST', seriesURL + "ajax/chapters/");
    return this.jsonChainedResponse(responseData, nextRequest);
  }

  chapterListAndMangaDetailsRequest(seriesURL) {
    return this.chapterListRequest('GET', `${seriesURL}`);
  }

  chapterListAndMangaDetailsParse(chapterListAndDetailsResponse, $, seriesURL) {
    console.log(`Url is s ${seriesURL}`);

    if (arguments.length == 4) {
      var chainedResponseData = arguments[3];
      console.log("473 chainedResponseData -- ", chainedResponseData);

      if (typeof chainedResponseData !== 'object') {
        chainedResponseData = JSON.parse(chainedResponseData) || chainedResponseData || {};
      }

      let nextChaptersPage = this.chapterListParse(chapterListAndDetailsResponse, null, seriesURL);

      if (!nextChaptersPage.hasNextPage) {
        console.log("finished getting chapters");
        $ = cheerio.load(nextChaptersPage.chapters);
        var allChapters = [];
        var thisReference = this;
        $(this.chapterListSelector()).each(function (i, chapterElement) {
          var chapter = thisReference.chapterFromElement(chapterElement);
          allChapters.push(chapter); //the chapter object
        });
        console.log("final chapters -- ", nextChaptersPage);
        var mangaDetails = chainedResponseData.mangaDetails;
        console.log("finalDetails -- ", mangaDetails);
        mangaDetails.chapters = allChapters;
        return mangaDetails;
      }
    } else {
      var firstChainedResponseParseWithDetails = this.mangaDetailsParse(chapterListAndDetailsResponse, null, seriesURL);
      return firstChainedResponseParseWithDetails;
    }
  }

  async fetchChapterListAndDetails(seriesURL) {
    var mangaDetailsResponse = await this.send_request(this.chapterListRequest('GET', seriesURL));
    var firstChainedResponseParseWithDetails = this.mangaDetailsParse(mangaDetailsResponse, null, seriesURL);
    var currentChainedResponseParse = firstChainedResponseParseWithDetails;

    do {
      console.log("currentChainedResponseParse -- ", currentChainedResponseParse);

      if (currentChainedResponseParse.hasOwnProperty('chapters')) {
        return currentChainedResponseParse;
      } else {
        var nextPageChapterListResponse = await this.send_request(currentChainedResponseParse.nextRequest);
        currentChainedResponseParse = this.chapterListAndMangaDetailsParse(nextPageChapterListResponse, null, seriesURL, currentChainedResponseParse.responseData);
      }
    } while (!currentChainedResponseParse.hasOwnProperty('chapters'));

    return currentChainedResponseParse;
  }

  pageListSelector() {
    return "div.page-break img";
  }

  pageListRequest(chapter) {
    if (chapter.chapter.startsWith('http')) {
      return this.getRequestWithHeaders('GET', chapter.chapter);
    } else {
      return this.getRequestWithHeaders('GET', super.pageListRequest(chapter));
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

      if (url.startsWith("https://convert_image_digi.mgicdn.com")) {
        url = "https://images.weserv.nl/?url=" + thisReference.substringAfterFirst("//", url);
      }

      var headers = {};
      headers['Referer'] = thisReference.pageListRequest(chapter);
      headers['Content-Type'] = 'image/jpeg';
      pages.push(thisReference.jsonBrowserifyRequest(url, null, null, headers, null));
    });
    console.log('Isekaiscan pages', pages);
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
    console.log("fetchLatestManga -- Isekaiscan");
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
      var mangaUpdate = new Isekaiscan().latestUpdatesFromElement($(this));
      mangaUpdate.updates = 1;
      json.push(mangaUpdate);
    });
    console.log("Isekaiscan latest -- ", json);
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
    console.log(response);
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
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language", ["English"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content", ["Manga", "Manwha", "Manhua", "Adult"], ["#4D83C1", "#4D83C1", "#4D83C1", "#ff1100"]));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor", ["xOnlyFadi"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("note", ["Details requires infinite requests"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker", ["No"], []));
    console.log("Isekaiscan sourceInfo -- ", sourceInfo);
    return sourceInfo;
  }

  searchMangaRequest(page, query, filters) {
    console.log("Isekaiscan filters -- ", filters);
    var query = query = query.replace(/_/g, "+");

    if (Object.keys(filters).length === 0) {
      console.log("filters are empty");
      var url = this.getRequestWithHeaders("GET", this.baseUrl + `/page/${page}?s=` + this.normalizeSearchQuery(query) + `&post_type=wp-manga`);
      console.log("attempting to fetch search request for Isekaiscan - searchUrl is ", url);
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
      console.log("attempting to fetch search request for Isekaiscan - searchUrl is ", finsihedur);
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
      json.push(new Isekaiscan().searchMangaFromElement($(this)));
    });
    var page = parseInt(page);
    var lastPageNumber = this.searchMangaNextPageSelector(response);
    console.log("lastPageNumber - ", lastPageNumber);
    var mangasPage = {};
    mangasPage.mangas = json;
    mangasPage.hasNextPage = lastPageNumber;
    mangasPage.nextPage = page + 1;
    console.log("mangasPage -- ", mangasPage);
    var results = json.length;
    mangasPage.results = results;
    return mangasPage;
  }

  getGenresList() {
    return {
      'isekai': 'Isekai',
      'manhua': 'Manhua',
      'manhwa': 'Manhwa',
      'polish-comics': 'Polish Comics',
      'shoujo': 'Shoujo',
      'action': 'Action',
      'adventure': 'Adventure',
      'comedy': 'Comedy',
      'cooking': 'Cooking',
      'crime': 'Crime',
      'crossdressing': 'Crossdressing',
      'doujinshi': 'Doujinshi',
      'drama': 'Drama',
      'ecchi': 'Ecchi',
      'fantasy': 'Fantasy',
      'gender-bender': 'Gender Bender',
      'gore': 'Gore',
      'gyaru': 'Gyaru',
      'harem': 'Harem',
      'historical': 'Historical',
      'horror': 'Horror',
      'indonesian': 'Indonesian',
      'josei': 'Josei',
      'loli': 'Loli',
      'magic': 'Magic',
      'martial-arts': 'Martial Arts',
      'mature': 'Mature',
      'adult': 'Mature 2 (Adult)',
      'mecha': 'Mecha',
      'medical': 'Medical',
      'monster-girls': 'Monster Girls',
      'music': 'Music',
      'mystery': 'Mystery',
      'post-apocalyptic': 'Post Apocalyptic',
      'psychological': 'Psychological',
      'reincarnation': 'Reincarnation',
      'reverse-harem': 'Reverse Harem',
      'revenge': 'Revenge',
      'romance': 'Romance',
      'seinen': 'Seinen',
      'shota': 'Shota',
      'shoujo-ai': 'Shoujo Ai',
      'shounen': 'Shounen',
      'shounen-ai': 'Shounen Ai',
      'si-fi': 'Si-Fi',
      'slice-of-life': 'Slice Of Life',
      'sports': 'Sports',
      'superhero': 'Superhero',
      'supernatural': 'Supernatural',
      'tragedy': 'Tragedy',
      'yaoi': 'Yaoi',
      'yuri': 'Yuri',
      'zombies': 'Zombies'
    };
  }

};