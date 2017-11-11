const tzParser = require('fb-moment-tzparser');

const locale = {
    kr: 'ko_KR',
    us: 'en_US',
};

const koreanRegionMap = {
    Seoul: 'KR-11',
    Busan: 'KR-26',
    Daegu: 'KR-27',
    Incheon: 'KR-28',
    Gwangju: 'KR-29',
    Daejeon: 'KR-30',
    Ulsan: 'KR-31',
    'Gyeonggi-do': 'KR-41',
    'Gangwon-do': 'KR-42',
    'Chungcheongbuk-do': 'KR-43',
    'Chungcheongnam-do': 'KR-44',
    'Jeollabuk-do': 'KR-45',
    'Jeollanam-do': 'KR-46',
    'Gyeongsangbuk-do': 'KR-47',
    'Gyeongsangnam-do': 'KR-48',
    'Jeju-do': 'KR-49',
};

const fullDayMilliseconds = 24 * 60 * 60 * 1000;

exports.timezone = tz => tzParser.parse(tz);
exports.locale = (loc) => {
    if (!locale[loc]) throw new Error('Invalid locale: Use either \'us\' or \'kr\' (eg. ?locale=us)');
    return locale[loc];
};
exports.fullDayMilliseconds = fullDayMilliseconds;
exports.parseFbRegion = region => koreanRegionMap[region];
