'use strict';

const Source = require('./source.js');

var rp = require('request-promise');

var cheerio = require('cheerio');

module.exports = class ToonilyCom extends Source {
  constructor() {
    super();
    this.baseUrl = 'https://toonily.com';
  }

  getRequestWithHeaders(method, url) {
    var userAgent = '';
    var cookie = '';
    var hosts = this.baseUrl.replace(/^(https?:|)\/\//, '');

    if (this.cfheaders != null) {
      if (this.cfheaders['User-Agent'] != null) {
        userAgent = this.cfheaders['User-Agent'];
      }

      if (this.cfheaders['Cookie'] != null) {
        cookie = this.cfheaders['Cookie'];
      }
    }

    var options = {
      'method': method,
      'url': url,
      'headers': {
        'Host': hosts,
        'User-Agent': userAgent,
        'Cookie': cookie
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

    var userAgent = '';
    var cookie = '';

    if (this.cfheaders != null) {
      if (this.cfheaders['User-Agent'] != null) {
        userAgent = this.cfheaders['User-Agent'];
      }

      if (this.cfheaders['Cookie'] != null) {
        cookie = this.cfheaders['Cookie'];
      }
    }

    var hosts = this.baseUrl.replace(/^(https?:|)\/\//, '');
    var pages = page - 1;
    var options = {
      'method': 'POST',
      'url': url,
      'headers': {
        'Host': hosts,
        'User-Agent': userAgent,
        'Cookie': cookie,
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
    var thumbnai = element.find('img').attr('data-src');
    var rank = '0';

    if (typeof thumbnai === undefined) {
      thumbnai = element.find('img').attr('src');
    }

    var thumbnail = thumbnai + '?';
    return super.manga(name, url, thumbnail, rank);
  }

  searchMangaNextPageSelector(firstPageHtml) {
    var $ = cheerio.load(firstPageHtml);
    var nextPage = $('a.nextpostslink');

    if (nextPage.contents().length !== 0) {
      return true;
    } else {
      return false;
    }
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
    return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
  }

  pageListSelector() {
    return "div.page-break img";
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

  pageListParse(pageListResponse, chapter) {
    var userAgent = '';
    var cookie = '';

    if (this.cfheaders != null) {
      if (this.cfheaders['User-Agent'] != null) {
        userAgent = this.cfheaders['User-Agent'];
      }

      if (this.cfheaders['Cookie'] != null) {
        cookie = this.cfheaders['Cookie'];
      }
    }

    var $ = cheerio.load(pageListResponse);
    var thisReference = this;
    var pages = [];
    $(this.pageListSelector()).each(function (i, pageElement) {
      var url = $(pageElement).attr('src');

      if (typeof url === "undefined") {
        url = $(pageElement).attr('data-src');
      }

      var headers = {};
      headers['Referer'] = thisReference.pageListRequest(chapter)['url'];
      headers['Content-Type'] = 'image/jpeg';
      headers['Cookie'] = cookie;
      headers['User-Agent'] = userAgent;
      pages.push(thisReference.jsonBrowserifyRequest(url.trim(), null, null, headers, null));
    });
    console.log('ToonilyCom pages', pages);

    if (pages.length == 0) {
      return "error - set your cookie";
    } else {
      return pages;
    }
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
    console.log("fetchLatestManga -- ToonilyCom");
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
      var mangaUpdate = new ToonilyCom().latestUpdatesFromElement($(this));
      mangaUpdate.updates = 1;
      json.push(mangaUpdate);
    });
    console.log("ToonilyCom latest -- ", json);
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
    sourceInfo.isCloudFlareSite = true;
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
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("note", ["Uses Cloudflare"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker", ["No"], []));
    console.log("ToonilyCom sourceInfo -- ", sourceInfo);
    return sourceInfo;
  }

  searchMangaRequest(page, query, filters) {
    console.log("ToonilyCom filters -- ", filters);
    var query = query = query.replace(/_/g, "+");

    if (Object.keys(filters).length === 0) {
      console.log("filters are empty");
      var url = this.getRequestWithHeaders("GET", this.baseUrl + `/page/${page}?s=` + this.normalizeSearchQuery(query) + `&post_type=wp-manga`);
      console.log("attempting to fetch search request for ToonilyCom - searchUrl is ", url);
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
      console.log("attempting to fetch search request for ToonilyCom - searchUrl is ", finsihedur);
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
      json.push(new ToonilyCom().searchMangaFromElement($(this)));
    });
    var page = parseInt(page);
    var lastPageNumber = this.searchMangaNextPageSelector(response);
    console.log("lastPageNumber - ", lastPageNumber);
    var mangasPage = {};
    mangasPage.mangas = json;
    mangasPage.hasNextPage = lastPageNumber;
    mangasPage.nextPage = page + 1;
    var results = json.length;
    mangasPage.results = results;
    console.log("mangasPage -- ", mangasPage);
    return mangasPage;
  }

  getGenresList() {
    return {
      "action-webtoon": "Action",
      "adventure-webtoon": "Adventure",
      "age-gap": "Age Gap",
      "all-ages": "All Ages",
      "bdsm": "BDSM",
      "campus": "Campus",
      "comedy-webtoon": "Comedy",
      "crime": "Crime",
      "drama-webtoon": "Drama",
      "fantasy-webtoon": "Fantasy",
      "female-friend": "Female Friend",
      "gender-bender": "Gender Bender",
      "gossip": "Gossip",
      "harem-webtoon": "Harem",
      "webtoon-historical": "Historical",
      "horror-webtoon": "Horror",
      "incest": "Incest",
      "isekai": "Isekai",
      "josei-manga": "Josei",
      "magic": "Magic",
      "martial-arts": "Martial Arts",
      "mature-webtoon": "Mature",
      "mystery-webtoon": "Mystery",
      "ntr-webtoon": "NTR",
      "office": "Office",
      "psychological-webtoon": "Psychological",
      "rape": "Rape",
      "reincarnation": "Reincarnation",
      "revenge": "Revenge",
      "reverse-harem": "Reverse Harem",
      "romance-webtoon": "Romance",
      "school-life-webtoon": "School life",
      "scifi-webtoon": "Sci-Fi",
      "secret-relationship": "Secret Relationship",
      "seinen-webtoon": "Seinen",
      "shoujo": "Shoujo",
      "shounen-webtoon": "Shounen",
      "sliceoflife-webtoon": "Slice of Life",
      "sports": "Sports",
      "supernatural-webtoon": "Supernatural",
      "thriller-webtoon": "Thriller",
      "tragedy": "Tragedy",
      "uncensored": "Uncensored",
      "work-life": "Work Life",
      "yaoi-webtoon": "Yaoi",
      "yuri-webtoon": "Yuri"
    };
  }

};