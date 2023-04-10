'use strict';

const Source = require('./source.js');

var rp = require('request-promise');

var cheerio = require('cheerio'); //const QuickJS = require('quickjs');


const vm = require('vm'); //var cloudscraper = require('cloudscraper'); //for image download to bypass cloudflare


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
    var thumbnail_url = element.find('img').first().attr("src"); //titleCheerio('img').first().attr("src");
    //thumbnail sometimes already has https, so don't use baseUrl for those

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
    //return 'table.listing tr:has(a) td:nth-child(1)';
    return '.list-comic .item';
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

  trimIndent(str) {
    const lines = str.split('\n');
    const minIndent = lines.filter(line => line.trim().length > 0).reduce((min, line) => Math.min(min, line.match(/^\s*/)[0].length), Infinity);
    const trimmedLines = lines.map(line => minIndent < Infinity ? line.slice(minIndent) : line);
    return trimmedLines.join('\n').trim();
  }

  getRGuardBytecode(scriptBody) {
    /*const ATOB_SCRIPT = `
                var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                    b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
                 atob = function(string) {
                    // atob can work with strings with whitespaces, even inside the encoded part,
                    // but only \t, \n, \f, \r and ' ', which can be stripped.
                    string = String(string).replace(/[\t\n\f\r ]+/g, "");
                    if (!b64re.test(string))
                        throw new TypeError("Failed to execute 'atob' on 'Window': The string to be decoded is not correctly encoded.");
                     // Adding the padding if missing, for semplicity
                    string += "==".slice(2 - (string.length & 3));
                    var bitmap, result = "", r1, r2, i = 0;
                    for (; i < string.length;) {
                        bitmap = b64.indexOf(string.charAt(i++)) << 18 | b64.indexOf(string.charAt(i++)) << 12
                                | (r1 = b64.indexOf(string.charAt(i++))) << 6 | (r2 = b64.indexOf(string.charAt(i++)));
                         result += r1 === 64 ? String.fromCharCode(bitmap >> 16 & 255)
                                : r2 === 64 ? String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255)
                                : String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255, bitmap & 255);
                    }
                    return result;
                };
            `;*/
    //escape $ and `
    const ATOB_SCRIPT = this.trimIndent(`
                    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                        b64re = /^(?:[A-Za-z\\d+\\/]{4})*?(?:[A-Za-z\\d+\\/]{2}(?:==)?|[A-Za-z\\d+\\/]{3}=?)?\$/;

                    atob = function(string) {
                        // atob can work with strings with whitespaces, even inside the encoded part,
                        // but only \\t, \\n, \\f, \\r and ' ', which can be stripped.
                        string = String(string).replace(/[\\t\\n\\f\\r ]+/g, "");
                        if (!b64re.test(string))
                            throw new TypeError("Failed to execute 'atob' on 'Window': The string to be decoded is not correctly encoded.");

                        // Adding the padding if missing, for semplicity
                        string += "==".slice(2 - (string.length & 3));
                        var bitmap, result = "", r1, r2, i = 0;
                        for (; i < string.length;) {
                            bitmap = b64.indexOf(string.charAt(i++)) << 18 | b64.indexOf(string.charAt(i++)) << 12
                                    | (r1 = b64.indexOf(string.charAt(i++))) << 6 | (r2 = b64.indexOf(string.charAt(i++)));

                            result += r1 === 64 ? String.fromCharCode(bitmap >> 16 & 255)
                                    : r2 === 64 ? String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255)
                                    : String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255, bitmap & 255);
                        }
                        return result;
                    };
                `);
    const RGUARD_REGEX = /(^.+?)var \w=\(function\(\).+?;(function \w+.+?})if.+?(function beau.+)/;
    const scriptParts = scriptBody.match(RGUARD_REGEX).slice(1);
    return scriptParts.join('') + ATOB_SCRIPT;
  }

  urlDecode(urls, rguardScript) {
    //here $ should not be escaped
    const script = new vm.Script(rguardScript + `
            var images = ${JSON.stringify(urls)};
            beau(images);
            images;
        `);
    const context = vm.createContext({});
    const result = script.runInContext(context);
    return result.map(item => String(item));
  }

  pageListParse(pageListResponse, chapter) {
    //original

    /*var rguardScriptContent = `var J=z;(function(w,v){var Q=z,m=w();while(!![]){try{var x=parseInt(Q(0x1c4))/(0x3*0xbcf+-0x709*0x3+0x5*-0x2dd)+-parseInt(Q(0x19d))/(-0x8*-0x1cf+-0x127d*-0x1+-0x20f3)*(-parseInt(Q(0x1c1))/(0x5d7+-0x1*0x34d+-0x287))+parseInt(Q(0x1c3))/(0x15d5+-0x23e*0x4+-0xcd9)*(parseInt(Q(0x1bd))/(0x708+0x1a*0x66+0x115f*-0x1))+parseInt(Q(0x1a1))/(0x8b*0x3e+-0x63+-0x1*0x2141)*(parseInt(Q(0x1ba))/(-0x2701*0x1+0x3be*-0xa+-0x131d*-0x4))+parseInt(Q(0x19e))/(0x20c2+0x4d3*0x2+0x1c4*-0x18)*(parseInt(Q(0x1b4))/(-0xe47+0x40*-0x89+0x3090))+-parseInt(Q(0x1b2))/(-0x1da3+-0x19f2+-0x379f*-0x1)+-parseInt(Q(0x1ad))/(0x17bf+-0x126c+0x1*-0x548);if(x===v)break;else m['push'](m['shift']());}catch(O){m['push'](m['shift']());}}}(C,0x5201d+0x8177b+-0x8438a));function C(){var p=['apply','12660tvJGWE','Safari','Console\x20detected','css','117570gHkeGB','isOpen','172rxEtvw','577939gQYDQk','search','substring','=s1600','36px','https','https://2.bp.blogspot.com/','30cdijHw','45512bMwXMy','userAgent','detail','180426TMVqSL','addEventListener','#divImage','Firefox','replace','defineProperty','ctrlKey','toString','=s0','devtoolschange','indexOf','Chrome','13276945cibNfZ','length','=s0?','coc_coc_browser','MSIE','2046760WYAoJx','keyCode','207leDzTD','preventDefault','(((.+)+)+)+$','Dev\x20tools\x20checker','=s1600?','html','77tkRcuq','constructor'];C=function(){return p;};return C();}var f=(function(){var w=!![];return function(v,m){var x=w?function(){var e=z;if(m){var O=m[e(0x1bc)](v,arguments);return m=null,O;}}:function(){};return w=![],x;};}()),s=f(this,function(){var P=z;return s['toString']()['search'](P(0x1b6))[P(0x1a8)]()[P(0x1bb)](s)[P(0x1c5)](P(0x1b6));});s(),$(document)['keydown'](function(w){var y=z;if(w['keyCode']==0x406*-0x3+0x122*0x2+0xa49)return![];else{if(w[y(0x1a7)]&&w['shiftKey']&&w[y(0x1b3)]==0x2430+0x2*-0xe52+-0x743)return![];}}),$(J(0x1a3))['on']('contextmenu',function(w){var F=J;w[F(0x1b5)]();});function z(s,f){var w=C();return z=function(v,m){v=v-(-0x1*0xeb4+0x160d+-0x5bf);var x=w[v];return x;},z(s,f);}if(navigator[J(0x19f)]['indexOf'](J(0x1ac))!=-(0x1eca+0x1865*-0x1+0x2*-0x332)||navigator['userAgent']['indexOf'](J(0x1be))!=-(-0x7c*0x15+-0x14f9+0x6*0x531)||navigator[J(0x19f)][J(0x1ab)](J(0x1b1))!=-(0x2*-0xa12+0x10c*-0x1f+0x3499)||navigator['userAgent'][J(0x1ab)](J(0x1b0))!=-(0x1*-0xd67+-0x532*-0x4+-0x760)){var checkStatus,element=new Image();Object[J(0x1a6)](element,'id',{'get':function(){var Y=J;checkStatus='on';throw new Error(Y(0x1b7));}}),setInterval(function check(){var B=J;checkStatus='off',console['dir'](element),checkStatus=='on'&&($(B(0x1a3))[B(0x1b9)](B(0x1bf)),$(B(0x1a3))['css']({'background':'','font-size':B(0x19a),'padding':'40px\x200px'}));},0x16*0x179+0x22d0+-0x3f4e);}navigator[J(0x19f)]['indexOf'](J(0x1a4))!=-(-0x1*0x4f7+0xce*0x29+-0x1c06)&&window[J(0x1a2)](J(0x1aa),w=>{var u=J;w[u(0x1a0)][u(0x1c2)]==!(-0x200*-0x13+0x230e*-0x1+-0x179*0x2)&&($(u(0x1a3))['html'](u(0x1bf)),$(u(0x1a3))[u(0x1c0)]({'background':'','font-size':u(0x19a),'padding':'40px\x200px'}));});function beau(w){var S=J;for(var v=-0x893+0x627+0x3e*0xa;v<w[S(0x1ae)];v++){w[v]=w[v][S(0x1a5)](/_x236/g,'d')[S(0x1a5)](/_x945/g,'g');if(w[v]['indexOf'](S(0x19b))!=-0x1421+-0x1021+0x2*0x1221){var m=w[v],x=m[S(0x1c6)](m[S(0x1ab)]('?'));m[S(0x1ab)](S(0x1af))>-0x18fe+0xb*0x3a+0x1680?m=m[S(0x1c6)](-0x1066+0x11be+0x56*-0x4,m['indexOf']('=s0?')):m=m[S(0x1c6)](-0x316*-0x4+-0x1*-0xe9f+-0x213*0xd,m[S(0x1ab)](S(0x1b8))),m=m[S(0x1c6)](-0x1*0x1f+0x19fe+-0x19db*0x1,-0x39e*0x4+0x1f52+-0x10c4)+m[S(0x1c6)](-0x9b9+-0x15a7+0x1*0x1f79),m=m[S(0x1c6)](-0x9*0x2de+0xd*-0x1bf+0x3*0x102b,m[S(0x1ae)]-(0x4ec+0xea2*0x2+-0x222a))+m[m['length']-(0x49*0x12+-0x1*0x1f76+-0x2*-0xd2b)]+m[m['length']-(-0x1dc7+0x4c7+-0x1901*-0x1)],m=decodeURIComponent(escape(atob(m))),m=m['substring'](-0x234c*-0x1+-0xa9*0x3a+0x2fe,-0xb*0x389+-0xaf9*0x3+-0x11b*-0x41)+m[S(0x1c6)](0x73d*0x3+0x1032+0xe*-0x2b4),w[v]['indexOf'](S(0x1a9))>0x1*-0x146b+-0x1ca*0x12+0x1*0x349f?m=m['substring'](0x4b1*-0x3+0x799+0x67a,m[S(0x1ae)]-(0xe0+-0x1*0x199a+0x18bc))+S(0x1a9):m=m['substring'](-0x18ca+0x1caf+-0x3e5,m[S(0x1ae)]-(-0x1f7c+0xeb9+0x10c5))+S(0x1c7),m=m+x,w[v]=S(0x19c)+m;}}}`;*/
    //escape template literals
    var rguardScriptContent = `var J=z;(function(w,v){var Q=z,m=w();while(!![]){try{var x=parseInt(Q(0x1c4))/(0x3*0xbcf+-0x709*0x3+0x5*-0x2dd)+-parseInt(Q(0x19d))/(-0x8*-0x1cf+-0x127d*-0x1+-0x20f3)*(-parseInt(Q(0x1c1))/(0x5d7+-0x1*0x34d+-0x287))+parseInt(Q(0x1c3))/(0x15d5+-0x23e*0x4+-0xcd9)*(parseInt(Q(0x1bd))/(0x708+0x1a*0x66+0x115f*-0x1))+parseInt(Q(0x1a1))/(0x8b*0x3e+-0x63+-0x1*0x2141)*(parseInt(Q(0x1ba))/(-0x2701*0x1+0x3be*-0xa+-0x131d*-0x4))+parseInt(Q(0x19e))/(0x20c2+0x4d3*0x2+0x1c4*-0x18)*(parseInt(Q(0x1b4))/(-0xe47+0x40*-0x89+0x3090))+-parseInt(Q(0x1b2))/(-0x1da3+-0x19f2+-0x379f*-0x1)+-parseInt(Q(0x1ad))/(0x17bf+-0x126c+0x1*-0x548);if(x===v)break;else m['push'](m['shift']());}catch(O){m['push'](m['shift']());}}}(C,0x5201d+0x8177b+-0x8438a));function C(){var p=['apply','12660tvJGWE','Safari','Console\\x20detected','css','117570gHkeGB','isOpen','172rxEtvw','577939gQYDQk','search','substring','=s1600','36px','https','https://2.bp.blogspot.com/','30cdijHw','45512bMwXMy','userAgent','detail','180426TMVqSL','addEventListener','#divImage','Firefox','replace','defineProperty','ctrlKey','toString','=s0','devtoolschange','indexOf','Chrome','13276945cibNfZ','length','=s0?','coc_coc_browser','MSIE','2046760WYAoJx','keyCode','207leDzTD','preventDefault','(((.+)+)+)+\$','Dev\\x20tools\\x20checker','=s1600?','html','77tkRcuq','constructor'];C=function(){return p;};return C();}var f=(function(){var w=!![];return function(v,m){var x=w?function(){var e=z;if(m){var O=m[e(0x1bc)](v,arguments);return m=null,O;}}:function(){};return w=![],x;};}()),s=f(this,function(){var P=z;return s['toString']()['search'](P(0x1b6))[P(0x1a8)]()[P(0x1bb)](s)[P(0x1c5)](P(0x1b6));});s(),\$(document)['keydown'](function(w){var y=z;if(w['keyCode']==0x406*-0x3+0x122*0x2+0xa49)return![];else{if(w[y(0x1a7)]&&w['shiftKey']&&w[y(0x1b3)]==0x2430+0x2*-0xe52+-0x743)return![];}}),\$(J(0x1a3))['on']('contextmenu',function(w){var F=J;w[F(0x1b5)]();});function z(s,f){var w=C();return z=function(v,m){v=v-(-0x1*0xeb4+0x160d+-0x5bf);var x=w[v];return x;},z(s,f);}if(navigator[J(0x19f)]['indexOf'](J(0x1ac))!=-(0x1eca+0x1865*-0x1+0x2*-0x332)||navigator['userAgent']['indexOf'](J(0x1be))!=-(-0x7c*0x15+-0x14f9+0x6*0x531)||navigator[J(0x19f)][J(0x1ab)](J(0x1b1))!=-(0x2*-0xa12+0x10c*-0x1f+0x3499)||navigator['userAgent'][J(0x1ab)](J(0x1b0))!=-(0x1*-0xd67+-0x532*-0x4+-0x760)){var checkStatus,element=new Image();Object[J(0x1a6)](element,'id',{'get':function(){var Y=J;checkStatus='on';throw new Error(Y(0x1b7));}}),setInterval(function check(){var B=J;checkStatus='off',console['dir'](element),checkStatus=='on'&&(\$(B(0x1a3))[B(0x1b9)](B(0x1bf)),\$(B(0x1a3))['css']({'background':'','font-size':B(0x19a),'padding':'40px\\x200px'}));},0x16*0x179+0x22d0+-0x3f4e);}navigator[J(0x19f)]['indexOf'](J(0x1a4))!=-(-0x1*0x4f7+0xce*0x29+-0x1c06)&&window[J(0x1a2)](J(0x1aa),w=>{var u=J;w[u(0x1a0)][u(0x1c2)]==!(-0x200*-0x13+0x230e*-0x1+-0x179*0x2)&&(\$(u(0x1a3))['html'](u(0x1bf)),\$(u(0x1a3))[u(0x1c0)]({'background':'','font-size':u(0x19a),'padding':'40px\\x200px'}));});function beau(w){var S=J;for(var v=-0x893+0x627+0x3e*0xa;v<w[S(0x1ae)];v++){w[v]=w[v][S(0x1a5)](/_x236/g,'d')[S(0x1a5)](/_x945/g,'g');if(w[v]['indexOf'](S(0x19b))!=-0x1421+-0x1021+0x2*0x1221){var m=w[v],x=m[S(0x1c6)](m[S(0x1ab)]('?'));m[S(0x1ab)](S(0x1af))>-0x18fe+0xb*0x3a+0x1680?m=m[S(0x1c6)](-0x1066+0x11be+0x56*-0x4,m['indexOf']('=s0?')):m=m[S(0x1c6)](-0x316*-0x4+-0x1*-0xe9f+-0x213*0xd,m[S(0x1ab)](S(0x1b8))),m=m[S(0x1c6)](-0x1*0x1f+0x19fe+-0x19db*0x1,-0x39e*0x4+0x1f52+-0x10c4)+m[S(0x1c6)](-0x9b9+-0x15a7+0x1*0x1f79),m=m[S(0x1c6)](-0x9*0x2de+0xd*-0x1bf+0x3*0x102b,m[S(0x1ae)]-(0x4ec+0xea2*0x2+-0x222a))+m[m['length']-(0x49*0x12+-0x1*0x1f76+-0x2*-0xd2b)]+m[m['length']-(-0x1dc7+0x4c7+-0x1901*-0x1)],m=decodeURIComponent(escape(atob(m))),m=m['substring'](-0x234c*-0x1+-0xa9*0x3a+0x2fe,-0xb*0x389+-0xaf9*0x3+-0x11b*-0x41)+m[S(0x1c6)](0x73d*0x3+0x1032+0xe*-0x2b4),w[v]['indexOf'](S(0x1a9))>0x1*-0x146b+-0x1ca*0x12+0x1*0x349f?m=m['substring'](0x4b1*-0x3+0x799+0x67a,m[S(0x1ae)]-(0xe0+-0x1*0x199a+0x18bc))+S(0x1a9):m=m['substring'](-0x18ca+0x1caf+-0x3e5,m[S(0x1ae)]-(-0x1f7c+0xeb9+0x10c5))+S(0x1c7),m=m+x,w[v]=S(0x19c)+m;}}}`;
    var pages = [];
    const CHAPTER_IMAGES_REGEX = /lstImages\.push\(["'](.*)["']\)/g;
    const RGUARD_REGEX = /(^.+?)var \w=\(function\(\).+?;(function \w+.+?})if.+?(function beau.+)/;
    const $ = cheerio.load(pageListResponse);
    let rguardUrl = $("script[src*='rguard.min.js']").attr("src");
    const script = $("script:contains(lstImages.push)").html();

    if (!script) {
      console.log("Failed to find image URLs");
      return pages;
    }

    const matches = [...script.matchAll(CHAPTER_IMAGES_REGEX)];
    const urls = matches.map(match => match[1]); //urls are working here but coded bullshit

    const rguardBytecode = this.getRGuardBytecode(rguardScriptContent); //script hardcoded above
    //TODO -- infinite request pattern to pull live script in, this works for now
    //const rguardBytecode = await getRGuardBytecode(baseUrl, rguardUrl, headers);
    //const rguardScript = getRGuardScript(baseUrl, rguardUrl, headers);

    console.log("about to create decodedUrls");
    const decodedUrls = this.urlDecode(urls, rguardBytecode);
    console.log("readcomiconline -- decodedUrls -- ", decodedUrls);
    pages = decodedUrls.map((imageUrl, i) => ({
      index: i,
      url: imageUrl
    })); //pages = pages.map(url => thisReference.jsonBrowserifyRequest(url,null,null,headers,null));

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