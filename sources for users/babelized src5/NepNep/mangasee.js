/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
const Source = require('./source.js');
const rp = require('request-promise');
const cheerio = require('cheerio');
const { decodeHTML } = require('entities');
const { asSequence } = require('sequency');
const regex = {
    'chapters': /vm\.Chapters = (.*);/,
    'directory': /MainFunction\(\$http\).*vm\.Directory = (.*)vm\.GetIntValue/,
    'directory_image_host': /<img ng-src="(.*)\//
};

module.exports = class Mangasee extends Source {
    constructor() {
        super();
        this.baseUrl = 'https://mangasee123.com';
    }

    getDirectory(data) {
        return JSON.parse(data.replace(/(\r\n|\n|\r)/gm, '').match(regex['directory'])[1].trim().replace(/;$/, ''));
    }

    getRequestWithHeaders(url) {
        return {
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/77.0',
                'Referer': `${this.baseUrl}/`
            }
        };
    }

    popularMangaRequest(page) {
        return this.getRequestWithHeaders(`${this.baseUrl}/search/`);
    }

    latestUpdatesRequest(page) {
        return this.popularMangaRequest(1);
    }

    searchMangaRequest(page, query, filters) {
        return this.popularMangaRequest(1);
    }

    chapterListRequest(seriesURL) {
        return this.getRequestWithHeaders(this.baseUrl + seriesURL);
    }

    mangaDetailsRequest(seriesURL) {
        return this.getRequestWithHeaders(this.baseUrl + seriesURL);
    }

    pageListRequest(chapter) {
        return this.getRequestWithHeaders(`${this.baseUrl}/read-online/${chapter.chapter}`);
    }

    chapterListParse(response, $, seriesURL) {
        console.log('started chapterListParse');
        if ($ == null) {
            $ = cheerio.load(response);
        }
        console.log('chapterListParse loaded into cheerio');
        const chapterJS = JSON.parse($.root().html().match(regex['chapters'])[1]).reverse();
        const chapters = [];

        for (const elem of chapterJS) {
            const chapterCode = elem.Chapter;
            const volume = chapterCode.substring(0, 1);
            const index = volume != 1 ? '-index-' + volume : '';
            const n = parseInt(chapterCode.slice(1, -1));
            const a = Number(chapterCode[chapterCode.length - 1]);
            const m = a != 0 ? '.' + a : '';
            const id = seriesURL.replace(/\/manga\//, '') + '-chapter-' + n + m + index + '.html';
            const chapNum = (n + a * .1).toString();
            const name = elem.ChapterName ? elem.ChapterName : ''; // can be null)

            chapters.push({
                title: name,
                url: id,
                volume,
                number: chapNum,
                language: 'English',
                date_upload: '',
                scanlator: ''
            });
        }

        console.log('chapterListParse finished');
        return chapters;
    }

    mangaDetailsParse(response, $, seriesURL) {
        console.log('started mangaDetailsParse');
        if ($ == null) {
            $ = cheerio.load(response);
        }
        const json = $('[type=application\\/ld\\+json]').html().replace(/\n*/g, '');
        const jsonWithoutAlternateName = json.replace(/"alternateName".*?],/g, '');
        const parsedJson = JSON.parse(jsonWithoutAlternateName);
        const imgSource = $('.ImgHolder').html().match(/src="(.*)\//)[1];

        console.log('mangaDetailsParse loaded into cheerio');
        const info = $('.row');
        const entity = parsedJson.mainEntity;
        const thumbnail = `${imgSource}/${seriesURL}.jpg`;
        const title = this.decodeHTMLEntity($('h1', info).first().text());
        const author = this.decodeHTMLEntity(entity.author[0]);
        const artist = '';
        const genres = [];

        let status = 'ONGOING';
        let description = '';

        const details = $('.list-group', info);
        for (const row of $('li', details).toArray()) {
            const text = $('.mlabel', row).text();
            switch (text) {
                case 'Type:':
                    {
                        const type = $('a', row).text();
                        genres.push(type.trim());
                        break;
                    }
                case 'Status:':
                    {
                        status = $(row).text().includes('Ongoing') ? 'ONGOING' : 'COMPLETED';
                        break;
                    }
                case 'Description:':
                    {
                        description = this.decodeHTMLEntity($('div', row).text().trim());
                        break;
                    }
            }
        }

        for (const gen of entity.genre) {
            genres.push(gen);
        }

        console.log('finishedMangaDetails parse');
        return this.mangaDetails(title, thumbnail, description, author, artist, status, genres);
    }

    chapterListAndMangaDetailsParse(chapterListAndDetailsResponse, $, seriesURL) {
        const mangaDetails = this.mangaDetailsParse(chapterListAndDetailsResponse, $, seriesURL);
        const chapters = this.chapterListParse(chapterListAndDetailsResponse, $, seriesURL);
        mangaDetails.chapters = chapters;
        return mangaDetails;
    }

    async fetchPageList(chapter) {
        const pageListResponse = await this.send_request(this.pageListRequest(chapter));
        return this.pageListParse(pageListResponse, chapter);
    }

    pageListParse(pageListResponse, chapterj) {
        const headers = {
            Referer: `${this.baseUrl}/`,
            'Content-Type': 'image/jpeg'
        };
        const pages = [];

        const variableName = pageListResponse.match(/ng-src="https:\/\/{{([a-zA-Z0-9.]+)}}\/manga\/.+\.png/)[1];
        const matchedPath = pageListResponse.match(new RegExp(`${variableName} = "(.*)";`))[1];

        const chapterInfo = JSON.parse(pageListResponse.match(/vm.CurChapter = (.*);/)[1]);
        const pageNum = Number(chapterInfo.Page);

        const chapter = chapterInfo.Chapter.slice(1, -1);
        const odd = chapterInfo.Chapter[chapterInfo.Chapter.length - 1];
        const chapterImage = odd == 0 ? chapter : chapter + '.' + odd;

        for (let i = 0; i < pageNum; i++) {
            const s = '000' + (i + 1);
            const page = s.substr(s.length - 3);
            pages.push(this.jsonBrowserifyRequest(`https://${matchedPath}/manga/${chapterj.series.replace(/\/manga\//, '')}/${chapterInfo.Directory == '' ? '' : chapterInfo.Directory + '/'}${chapterImage}-${page}.png`, null, null, headers, null));
        }

        console.log('AsuraScans pages', pages);
        return pages;
    }

    async fetchLatestManga(page) {
        console.log('fetchLatestManga -- AsuraScans');
        page = Number(page);

        const currentPageHtml = await this.send_request(this.latestUpdatesRequest(`${page}`));
        return this.latestUpdatesParse(page, currentPageHtml);
    }

    latestUpdatesParse(page, response) {
        page = Number(page);

        const json = [];
        const directory = asSequence(this.getDirectory(response)).sortedByDescending(it => it['lt']).toArray();
        const imgSource = response.match(regex['directory_image_host'])[1];

        for (const elem of directory) {
            json.push({
                name: this.decodeHTMLEntity(elem.s.trim()),
                url: `/manga/${elem.i}`,
                thumbnail: `${imgSource}/${elem.i}.jpg`,
                rank: '0',
                updates: 1
            });
        }

        console.log('mangasee latest -- ', json);

        let mangasPage = {};
        mangasPage.mangas = json;

        const hasNextPage = false;
        const nextPage = page + 1;

        let results = json.length;

        return super.mangasPage(json, hasNextPage, nextPage, results);
    }

    popularMangaParse(page, response) {
        page = Number(page);
        const json = [];
        const directory = asSequence(this.getDirectory(response)).sortedByDescending(it => it['v']).toArray();
        const imgSource = response.match(regex['directory_image_host'])[1];

        for (const elem of directory) {
            json.push({
                name: this.decodeHTMLEntity(elem.s.trim()),
                url: `/manga/${elem.i}`,
                thumbnail: `${imgSource}/${elem.i}.jpg`,
                rank: '0'
            });
        }

        const hasNextPage = false;
        const nextPage = page + 1;
        let results = json.length;

        return this.mangasPage(json, hasNextPage, nextPage, results);
    }

    searchMangaParse(page, response, query, filters) {
        page = Number(page);
        const json = [];
        const genres = [];
        const genresNo = [];

        let directory = this.getDirectory(response);
        const imgSource = response.match(regex['directory_image_host'])[1];
        if (query !== '') {
            const trimmedQuery = this.normalizeSearchQuery(query.trim().toLowerCase());
            directory = asSequence(directory).filter(keyword => keyword['s'].trim().toLowerCase().includes(trimmedQuery) || keyword['al'].some(altName => altName.trim().toLowerCase().includes(trimmedQuery))).toArray();
        }
        for (const tags of filters) {
            switch (tags.key) {
                case 'sort':
                    {
                        if (tags.direction == 'asc') {
                            directory = asSequence(directory).sortedByDescending(it => it[tags.value]).toArray().reverse();
                        } else if (tags.direction == 'desc') {
                            directory = asSequence(directory).sortedByDescending(it => it[tags.value]).toArray();
                        }
                        break;
                    }
                case 'type':
                    {
                        if (tags.value.toLowerCase() == 'any') break;
                        const trimmedType = tags.value.toLowerCase().trim();
                        directory = asSequence(directory).filter(type => type['t'].trim().toLowerCase().includes(trimmedType)).toArray();
                        break;
                    }
                case 'status':
                    {
                        if (tags.value.toLowerCase() == 'any') break;
                        const trimmedScanS = tags.value.toLowerCase().trim();
                        directory = asSequence(directory).filter(status => status['ss'].trim().toLowerCase().includes(trimmedScanS)).toArray();
                        break;
                    }
                case 'pstatus':
                    {
                        if (tags.value.toLowerCase() == 'any') break;
                        const trimmedPublishS = tags.value.toLowerCase().trim();
                        directory = asSequence(directory).filter(pstatus => pstatus['ps'].trim().toLowerCase().includes(trimmedPublishS)).toArray();
                        break;
                    }
                case 'translation':
                    {
                        if (tags.value.toLowerCase() == 'any') break;
                        const trimmedTranslation = tags.value.toLowerCase().trim();
                        directory = asSequence(directory).filter(translation => translation['o'].trim().toLowerCase().includes(trimmedTranslation)).toArray();
                        break;
                    }
                case 'author':
                    {
                        const trimmedAuthor = tags.value.toLowerCase().trim();
                        directory = asSequence(directory).filter(author => author['a'].some(AuthName => AuthName.trim().toLowerCase().includes(trimmedAuthor))).toArray();
                        break;
                    }
                case 'year':
                    {
                        const trimmedYear = tags.value.toLowerCase().trim();
                        directory = asSequence(directory).filter(year => year['y'].trim().toLowerCase().includes(trimmedYear)).toArray();
                        break;
                    }
                case 'g_i':
                    {
                        const trimmedGenre = tags.value.trim().toLowerCase();
                        if (trimmedGenre.includes(',')) {
                            for (const splittedGenres of trimmedGenre.split(',')) {
                                genres.push(splittedGenres);
                            }
                        } else {
                            genres.push(trimmedGenre);
                        }
                        break;
                    }
                case 'g_e':
                    {
                        const trimmedGenre = tags.value.trim().toLowerCase();
                        if (trimmedGenre.includes(',')) {
                            for (const splittedGenres of trimmedGenre.split(',')) {
                                genresNo.push(splittedGenres);
                            }
                        } else {
                            genresNo.push(trimmedGenre);
                        }
                        break;
                    }
            }
        }

        if (genres.length !== 0) {
            for (const genreL of genres) {
                directory = asSequence(directory).filter(it => it['g'].some(gen => gen.trim().toLowerCase().includes(genreL))).toArray();
            }
        }
        if (genresNo.length !== 0) {
            for (const genreL of genresNo) {
                directory = asSequence(directory).filterNot(it => it['g'].some(gen => gen.trim().toLowerCase().includes(genreL))).toArray();
            }
        }

        for (const elem of directory) {
            json.push({
                name: this.decodeHTMLEntity(elem.s.trim()),
                url: `/manga/${elem.i}`,
                thumbnail: `${imgSource}/${elem.i}.jpg`,
                rank: '0'
            });
        }

        const hasNextPage = false;
        const nextPage = page + 1;
        const results = json.length;

        return this.mangasPage(json, hasNextPage, nextPage, results);
    }

    fetchSourceInfo() {
        const sourceInfo = {};
        sourceInfo.requiresLogin = false;
        sourceInfo.url = this.baseUrl;
        sourceInfo.isCloudFlareSite = false;

        let filters = [];

        let AuthorFilter = {
            'paramKey': 'author',
            'displayName': 'Author',
            'type': 'text'
        };

        let sortFilter = {
            'paramKey': 'sort',
            'displayName': 'Sort',
            'type': 'sort',
            'options': {
                's': 'Alphabetical',
                'lt': 'Recently Released Chapter',
                'y': 'Year Released',
                'v': 'Most Popular (All Time)',
                'vm': 'Most Popular (Monthly)'
            }
        };

        let TypeFFilter = {
            'paramKey': 'type',
            'displayName': 'Type',
            'type': 'choice',
            'options': {
                'Any': 'Any',
                'Doujinshi': 'Doujinshi',
                'Manga': 'Manga',
                'Manhua': 'Manhua',
                'Manhwa': 'Manhwa',
                'OEL': 'OEL',
                'One-shot': 'One-shot'
            }
        };

        let GeneresLISTS = {
            'paramKey': 'genres',
            'displayName': 'Genres',
            'type': 'doubletag',
            'includeKey': 'g_i',
            'excludeKey': 'g_e',
            'options': this.getGenresList()

        };

        let YearsRelFilter = {
            'paramKey': 'year',
            'displayName': 'Year',
            'type': 'text'
        };

        let OffTrFilter = {
            'paramKey': 'translation',
            'displayName': 'Official Translation',
            'type': 'choice',
            'options': {
                'no': 'Any',
                'yes': 'Official Translation Only'
            }
        };

        let ScanstatusFilter = {
            'paramKey': 'status',
            'displayName': 'Scan Status',
            'type': 'choice',
            'options': {
                'Any': 'Any',
                'Cancelled': 'Cancelled',
                'Complete': 'Complete',
                'Discontinued': 'Discontinued',
                'Hiatus': 'Hiatus',
                'Ongoing': 'Ongoing'
            }
        };

        let PublishstatusFilter = {
            'paramKey': 'pstatus',
            'displayName': 'Publish Status',
            'type': 'choice',
            'options': {
                'Any': 'Any',
                'Cancelled': 'Cancelled',
                'Complete': 'Complete',
                'Discontinued': 'Discontinued',
                'Hiatus': 'Hiatus',
                'Ongoing': 'Ongoing'
            }
        };

        filters.push(AuthorFilter);
        filters.push(sortFilter);
        filters.push(TypeFFilter);
        filters.push(GeneresLISTS);
        filters.push(YearsRelFilter);
        filters.push(OffTrFilter);
        filters.push(ScanstatusFilter);
        filters.push(PublishstatusFilter);

        sourceInfo.filters = filters;

        sourceInfo.displayInfo = [];

        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag('language', ['English'], null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag('content', ['Manga', 'Manhwa', 'Manhua', 'Doujinshi', 'OEL'], null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag('contributor', ['xOnlyFadi'], null));
        sourceInfo.displayInfo.push(super.jsonSourceDisplayInfoTag('tracker', ['No'], []));

        console.log('Mangasee sourceInfo -- ', sourceInfo);
        return sourceInfo;
    }

    getGenresList() {
        return {
            'Action': 'Action',
            'Adult': 'Adult',
            'Adventure': 'Adventure',
            'Comedy': 'Comedy',
            'Doujinshi': 'Doujinshi',
            'Drama': 'Drama',
            'Ecchi': 'Ecchi',
            'Fantasy': 'Fantasy',
            'Gender Bender': 'Gender Bender',
            'Harem': 'Harem',
            'Hentai': 'Hentai',
            'Historical': 'Historical',
            'Horror': 'Horror',
            'Isekai': 'Isekai',
            'Josei': 'Josei',
            'Lolicon': 'Lolicon',
            'Martial Arts': 'Martial Arts',
            'Martial Arts Shounen': 'Martial Arts Shounen',
            'Mature': 'Mature',
            'Mecha': 'Mecha',
            'Mystery': 'Mystery',
            'Psychological': 'Psychological',
            'Romance': 'Romance',
            'School Life': 'School Life',
            'Sci-fi': 'Sci-fi',
            'Seinen': 'Seinen',
            'Shotacon': 'Shotacon',
            'Shoujo': 'Shoujo',
            'Shoujo Ai': 'Shoujo Ai',
            'Shounen': 'Shounen',
            'Shounen Ai': 'Shounen Ai',
            'Slice of Life': 'Slice of Life',
            'Slice of Life Supernatural': 'Slice of Life Supernatural',
            'Smut': 'Smut',
            'Sports': 'Sports',
            'Supernatural': 'Supernatural',
            'Tragedy': 'Tragedy',
            'Yaoi': 'Yaoi',
            'Yuri': 'Yuri'
        };
    }

    normalizeSearchQuery(query) {
        query = query.toLowerCase();
        query = query.replace(/[àáạảãâầấậẩẫăằắặẳẵ]+/g, 'a');
        query = query.replace(/[èéẹẻẽêềếệểễ]+/g, 'e');
        query = query.replace(/[ìíịỉĩ]+/g, 'i');
        query = query.replace(/[òóọỏõôồốộổỗơờớợởỡ]+/g, 'o');
        query = query.replace(/[ùúụủũưừứựửữ]+/g, 'u');
        query = query.replace(/[ỳýỵỷỹ]+/g, 'y');
        query = query.replace(/[đ]+/g, 'd');
        query = query.replace(/%20/g, ' ');
        query = query.replace('+', ' ');
        return query;
    }

    decodeHTMLEntity(str) {
        return decodeHTML(str);
    }
};