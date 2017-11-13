const tzParser = require('fb-moment-tzparser');

const locale = {
    kr: 'ko_KR',
    us: 'en_US',
};

const koreanRegionMap = {
    Seoul: {
        name_kr: '서울',
        key: 'KR-11',
    },
    Busan: {
        name_kr: '부산',
        key: 'KR-26',
    },
    Daegu: {
        name_kr: '대구',
        key: 'KR-27',
    },
    Incheon: {
        name_kr: '인천',
        key: 'KR-28',
    },
    Gwangju: {
        name_kr: '광주',
        key: 'KR-29',
    },
    Daejeon: {
        name_kr: '대전',
        key: 'KR-30',
    },
    Ulsan: {
        name_kr: '울산',
        key: 'KR-31',
    },
    'Gyeonggi-do': {
        name_kr: '경기도',
        key: 'KR-41',
    },
    'Gangwon-do': {
        name_kr: '강원도',
        key: 'KR-42',
    },
    'Chungcheongbuk-do': {
        name_kr: '충청북도',
        key: 'KR-43',
    },
    'Chungcheongnam-do': {
        name_kr: '충청남도',
        key: 'KR-44',
    },
    'Jeollabuk-do': {
        name_kr: '전라북도',
        key: 'KR-45',
    },
    'Jeollanam-do': {
        name_kr: '전라남도',
        key: 'KR-46',
    },
    'Gyeongsangbuk-do': {
        name_kr: '경상북도',
        key: 'KR-47',
    },
    'Gyeongsangnam-do': {
        name_kr: '경상남도',
        key: 'KR-48',
    },
    'Jeju-do': {
        name_kr: '제주도',
        key: 'KR-49',
    },
};

const fullDayMilliseconds = 24 * 60 * 60 * 1000;

exports.timezone = tz => tzParser.parse(tz);
exports.locale = (loc) => {
    if (!locale[loc]) throw new Error('Invalid locale: Use either \'us\' or \'kr\' (eg. ?locale=us)');
    return locale[loc];
};
exports.fullDayMilliseconds = fullDayMilliseconds;
exports.koreanRegionMap = koreanRegionMap;
