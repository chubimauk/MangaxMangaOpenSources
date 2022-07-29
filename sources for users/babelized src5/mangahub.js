'use strict';

const Source = require('./source.js');

var rp = require('request-promise');

var cheerio = require('cheerio');

module.exports = class Mangahub extends Source {
  constructor() {
    super();
    this.baseUrl = 'https://mangahub.io';
    this.mangahub_cdn = 'https://img.mghubcdn.com/file/imghub/';
  }

  searchMangaSelector() {
    return this.popularMangaSelector();
  }

  searchMangaFromElement(element) {
    return this.mangaFromElement(element);
  }

  mangaFromElement(element) {
    var coverElement = element.find('.media-heading > a').first();
    var url = super.substringAfterFirst('.io', 'https:' + coverElement.attr('href'));
    var name = coverElement.text();
    var thumbnail = element.find('img.manga-thumb.list-item-thumb').first().attr('src');
    var rank = '0';
    return super.manga(name, url, thumbnail, rank);
  }

  latestUpdatesRequest(page) {
    return `${this.baseUrl}/updates/page/${page}`;
  }

  latestUpdatesSelector() {
    return this.popularMangaSelector();
  }

  latestUpdatesFromElement(element) {
    return this.mangaFromElement(element);
  }

  popularMangaRequest(page) {
    return `${this.baseUrl}/popular/page/${page}`;
  }

  popularMangaSelector() {
    return '#mangalist div.media-manga.media';
  }

  popularMangaFromElement(element) {
    return this.mangaFromElement(element);
  }

  getLastPageNumber(firstPageHtml, page) {
    var $ = cheerio.load(firstPageHtml);
    var lastPageHREFText = $('ul.pager li.next > a').attr('href');

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
    return ".tab-content .tab-pane li.list-group-item > a";
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
    var url = super.substringAfterFirst(this.baseUrl, $('a').attr('href'));
    var name = $('span._8Qtbo').text();
    var scanlator = "";
    var date_upload = $('small.UovLc').first().text();
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
    let titl = $('h1._3xnDj').first();
    titl.find('a').remove();
    let title = titl.text().trim();
    let thumbnail = $('img.img-responsive').attr('src');
    let author = $('._3QCtP > div:nth-child(2) > div:nth-child(1) > span:nth-child(2)').first().text().trim();
    let artist = $('._3QCtP > div:nth-child(2) > div:nth-child(2) > span:nth-child(2)').first().text().trim();
    let status = $('._3QCtP > div:nth-child(2) > div:nth-child(3) > span:nth-child(2)').first().text().toUpperCase().trim();
    var genres = [];
    $('._3Czbn a').each(function (i, chapterElement) {
      var gen = $(chapterElement).text();
      genres.push(gen);
    });
    let description = $('div#noanim-content-tab-pane-99 p.ZyMp7').first().text().trim();
    console.log('finishedMangaDetails parse');
    return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
  }

  pageListRequest(chapter) {
    var url = chapter.chapter;
    var slu = super.substringAfterFirst('chapter/', url);
    var slug = super.substringBeforeFirst('/', slu);
    var number = super.substringAfterFirst('chapter-', url).replace(/\//g, "");
    var options = {
      'method': 'POST',
      'url': 'https://api.mghubcdn.com/graphql',
      'headers': {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "query": `query {
                    chapter(x: m01, slug: "${slug}", number: ${Number(number)}) {
                      pages
                      title
                      slug
                    }
                  }`
      })
    };
    return options;
  }

  getRequestWithHeaders() {
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

    var options = {
      'headers': {
        'Referer': this.baseUrl,
        'User-Agent': userAgent,
        'Cookie': cookie
      }
    };
    console.log(`Options are ${JSON.stringify(options)}`);
    return options;
  }

  async fetchPageList(chapter) {
    var pageListResponse = await this.send_request(this.pageListRequest(chapter));
    return this.pageListParse(pageListResponse, chapter);
  }

  pageListParse(pageListResponse, chapter) {
    const obj = JSON.parse(pageListResponse);
    const pages = [];
    const data = JSON.parse(obj.data.chapter.pages);
    console.log(pageListResponse);

    for (const vals in data) {
      const url = this.mangahub_cdn + data[vals];
      pages.push(this.jsonBrowserifyRequest(url.trim(), null, null, this.getRequestWithHeaders().headers, null));
    }

    console.log('Mangahub pages', pages);
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
    console.log("fetchLatestManga -- Mangahub");
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
      var mangaUpdate = new Mangahub().latestUpdatesFromElement($(this));
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

    console.log("Mangahub latest -- ", json);
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
    var lastPageNumber = this.getLastPageNumber(response, page);
    var hasNextPage = lastPageNumber > page;
    var nextPage = page + 1;
    var results = json.length;

    if (lastPageNumber != null && lastPageNumber > 0) {
      results = results * lastPageNumber;
    }

    console.log("Mangahub popular -- ", json);
    return this.mangasPage(json, hasNextPage, nextPage, results);
  }

  fetchSourceInfo() {
    var sourceInfo = {};
    sourceInfo.requiresLogin = false;
    sourceInfo.url = "https://img.mghubcdn.com/file/imghub/martial-peak/2455/1.jpg";
    sourceInfo.isCloudFlareSite = true;
    var filters = [];
    var sortFilter = {};
    sortFilter.paramKey = 'sort';
    sortFilter.displayName = 'Order By';
    sortFilter.type = 'sort';
    sortFilter.options = {};
    sortFilter.options['POPULAR'] = 'Popular';
    sortFilter.options['LATEST'] = 'Updates';
    sortFilter.options['ALPHABET'] = 'A-Z';
    sortFilter.options['NEW'] = 'New';
    sortFilter.options['COMPLETED'] = 'Completed';
    var GeneresLISTS = {};
    GeneresLISTS.paramKey = 'genres';
    GeneresLISTS.displayName = 'Genres List';
    GeneresLISTS.type = 'choice';
    GeneresLISTS.options = this.getGenresList();
    filters.push(sortFilter);
    filters.push(GeneresLISTS);
    sourceInfo.filters = filters;
    sourceInfo.displayInfo = [];
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("language", ["English"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("content", ["Manga", "Manwha", "Manhua", "Adult"], ["#4D83C1", "#4D83C1", "#4D83C1", "#ff1100"]));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("contributor", ["xOnlyFadi"], null));
    sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag("tracker", ["No"], []));
    console.log("Mangahub sourceInfo -- ", sourceInfo);
    return sourceInfo;
  }

  searchMangaRequest(page, query, filters) {
    console.log("Mangahub filters -- ", filters);

    if (Object.keys(filters).length === 0) {
      console.log("filters are empty");
      var url = `${this.baseUrl}/search/page/${page}?q=${this.normalizeSearchQuery(query)}`;
      console.log("attempting to fetch search request for Mangahub - searchUrl is ", url);
      return url;
    } else {
      console.log("filters has properties");
      var url = `${this.baseUrl}/search/page/${page}`;

      if (!super.isEmpty(query)) {
        url = super.addQueryParameter(url, "s", this.normalizeSearchQuery(query), true);
      } else {
        url = super.addQueryParameter(url, "s", "", true);
      }

      for (var i = 0; i < filters.length; i++) {
        switch (filters[i].key) {
          case "sort":
            url = super.addQueryParameter(url, "order", filters[i].value, false);
            break;

          case "genres":
            url = super.addQueryParameter(url, "genre", filters[i].value, false);
            break;

          default:
            break;
        }
      }

      console.log("attempting to fetch search request for Mangahub - searchUrl is ", url);
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
    query = query.replace(/_/g, "+");
    return query;
  }

  searchMangaParse(page, response, query, filters) {
    var page = parseInt(page);
    var searchMangaSelector = this.searchMangaSelector();
    var json = [];
    var $ = cheerio.load(response);
    $(searchMangaSelector).each(function (i, elem) {
      json.push(new Mangahub().searchMangaFromElement($(this)));
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

  getGenresList() {
    return {
      "all": "All Genres",
      "no-chapters": "[no chapters]",
      "action": "Action",
      "adventure": "Adventure",
      "comedy": "Comedy",
      "adult": "Adult",
      "drama": "Drama",
      "historical": "Historical",
      "martial-arts": "Martial arts",
      "romance": "Romance",
      "ecchi": "Ecchi",
      "supernatural": "Supernatural",
      "webtoons": "Webtoons",
      "manhwa": "Manhwa",
      "fantasy": "Fantasy",
      "harem": "Harem",
      "shounen": "Shounen",
      "manhua": "Manhua",
      "mature": "Mature",
      "seinen": "Seinen",
      "sports": "Sports",
      "school-life": "School life",
      "smut": "Smut",
      "mystery": "Mystery",
      "psychological": "Psychological",
      "shounen-ai": "Shounen ai",
      "slice-of-life": "Slice of life",
      "shoujo-ai": "Shoujo ai",
      "cooking": "Cooking",
      "horror": "Horror",
      "tragedy": "Tragedy",
      "doujinshi": "Doujinshi",
      "sci-fi": "Sci fi",
      "yuri": "Yuri",
      "yaoi": "Yaoi",
      "shoujo": "Shoujo",
      "gender-bender": "Gender bender",
      "josei": "Josei",
      "mecha": "Mecha",
      "medical": "Medical",
      "one-shot": "One shot",
      "magic": "Magic",
      "shounenai": "Shounenai",
      "shoujoai": "Shoujoai",
      "4-koma": "4-Koma",
      "music": "Music",
      "webtoon": "Webtoon",
      "isekai": "Isekai",
      "game": "Game",
      "award-winning": "Award Winning",
      "oneshot": "Oneshot",
      "demons": "Demons",
      "parody": "Parody",
      "vampire": "Vampire",
      "military": "Military",
      "police": "Police",
      "super-power": "Super Power",
      "food": "Food",
      "kids": "Kids",
      "magical-girls": "Magical Girls",
      "space": "Space",
      "shotacon": "Shotacon",
      "wuxia": "Wuxia",
      "superhero": "Superhero",
      "thriller": "Thriller",
      "crime": "Crime",
      "philosophical": "Philosophical",
      "korean": "Korean",
      "adaptation": "Adaptation",
      "full-color": "Full Color",
      "chinese": "Chinese",
      "crossdressing": "Crossdressing",
      "reincarnation": "Reincarnation",
      "english-united-states": "English (United States)",
      "manga": "Manga",
      "cartoon": "Cartoon",
      "survival": "Survival",
      "japanese": "Japanese",
      "comic": "Comic",
      "english": "English",
      "harlequin": "Harlequin",
      "time-travel": "Time Travel",
      "traditional-games": "Traditional Games",
      "reverse-harem": "Reverse Harem",
      "animals": "Animals",
      "chinese-traditional": "Chinese (Traditional)",
      "aliens": "Aliens",
      "cars": "cars",
      "loli": "Loli",
      "video-games": "Video Games",
      "monsters": "Monsters",
      "office-workers": "Office Workers",
      "lolicon": "Lolicon",
      "system": "system",
      "villainess": "Villainess",
      "indonesian": "Indonesian",
      "zombies": "Zombies",
      "vampires": "Vampires",
      "western": "Western",
      "violence": "Violence",
      "monster-girls": "Monster Girls",
      "anthology": "Anthology",
      "ghosts": "Ghosts",
      "delinquents": "Delinquents",
      "action-manhua": "Action.Manhua",
      "post-apocalyptic": "Post-Apocalyptic",
      "xianxia": "Xianxia",
      "funny": "funny",
      "slice-of-lfie": "Slice of lfie",
      "xuanhuan": "Xuanhuan",
      "r-18": "R-18",
      "cultivation": "Cultivation",
      "rebirth": "Rebirth",
      "monster": "Monster",
      "gore": "Gore",
      "detective": "Detective",
      "family": "Family",
      "gisaeng": "Gisaeng",
      "russian": "Russian",
      "g0re": "G0re",
      "vi0lence": "Vi0lence",
      "leveling": "Leveling",
      "shouju": "Shouju",
      "manhuaga-scans": "Manhuaga Scans",
      "demon": "Demon",
      "hunters": "Hunters",
      "time": "Time",
      "orignal": "Orignal",
      "comdey": "Comdey",
      "gangs": "Gangs",
      "samurai": "Samurai",
      "ninja": "Ninja",
      "gambling": "Gambling",
      "dramaseinen": "DramaSeinen",
      "hot-blood": "Hot blood",
      "revenge": "Revenge",
      "anhua": "anhua",
      "romace": "Romace",
      "cheat-systems": "Cheat Systems",
      "not-provided": "Not Provided",
      "pets": "Pets",
      "reverse-time": "Reverse Time",
      "ladies": "Ladies",
      "vr": "VR",
      "dungeons": "Dungeons",
      "manhuascans": "ManhuaScans",
      "martial-art": "Martial Art",
      "reincarnate": "Reincarnate",
      "overpowered": "Overpowered",
      "modern-setting": "Modern Setting",
      "necromancer": "Necromancer",
      "showbiz": "Showbiz",
      "royal-family": "Royal family",
      "school": "School",
      "archery": "Archery",
      "long-strip": "LONG STRIP",
      "teacher": "teacher",
      "sekai": "SEKAI",
      "wuxia-i": "WUXIAI",
      "full-color-manhua": "FULL COLOR MANHUA",
      "ghost": "Ghost",
      "virtual": "Virtual",
      "shota": "SHOTA",
      "swords": "Swords",
      "web-comic": "WEB COMIC",
      "virtual-reality": "Virtual Reality",
      "superpowers": "Superpowers",
      "genderswap": "GENDERSWAP",
      "long-strip-romance": "LONG STRIP ROMANCE",
      "live-action": "Live action",
      "romance-fantasy": "ROMANCE .FANTASY",
      "battle-royale": "Battle Royale",
      "suggestive": "SUGGESTIVE",
      "fantasy-manhwa": "FANTASY MANHWA",
      "mafia": "MAFIA",
      "slice-of-lif": "SLICE OF LIF",
      "adaptatio": "ADAPTATIO",
      "teen": "Teen",
      "coming-soon": "Coming Soon",
      "murim": "Murim",
      "returner": "Returner",
      "misunderstanding": "Misunderstanding",
      "si-fi": "Si-fi",
      "beasts": "Beasts",
      "traverse": "Traverse",
      "science-fiction": "Science fiction",
      "campus": "Campus",
      "urban": "Urban",
      "user-created": "USER CREATED",
      "official-colored": "Official colored"
    };
  }

};