const tzParser = require('fb-moment-tzparser');
const moment = require('moment-timezone');

const locale = {
    kr: 'ko_KR',
    us: 'en_US',
};

const koreanRegionMap = {
    Unknown: {
        name_kr: '알수없음',
        key: 'UNKNOWN',
    },
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

async function getSamplePromotion(promotionId) {
    return {
        _id: promotionId || 'TEST_PROMO_ID',
        castrBizId: 'TEST_BIZ_ID',
        title: 'Promotion Title',
        description: 'This is the description of this promotion',
        effectiveDate: moment(),
        expirationDate: moment().add(28, 'day'),
        timezone: 'America/New_York',
        locations: [
            {
                id: 'TEST_LOC_ID_1',
                budget: {
                    value: 3000,
                    option: 'ADD',
                    optimized: false,
                },
                keywords: [
                    {
                        id: '6003605498820',
                        name: '골프공',
                    }
                ],
                targeting: {
                    gender: ['MALE', 'FEMALE'],
                    age: {
                        min: 20,
                        max: 60,
                    },
                    geolocation: {
                        useRadius: false,
                        radius: {
                            value: 5,
                            unit: 'kilometer',
                        },
                        included: [
                            {
                                key: 'JP',
                                name: 'Japan',
                                type: 'country',
                            },
                            {
                                key: 'KR',
                                name: 'South Korea',
                                type: 'country',
                            }
                        ],
                        excluded: [
                            {
                                key: '1268621',
                                name: 'Gwangju, Gwangju, South Korea',
                                type: 'city',
                            }
                        ],
                    },
                },
            },
            {
                id: 'TEST_LOC_ID_2',
                budget: {
                    value: 3000,
                    option: 'ADD',
                    optimized: false,
                },
                keywords: [
                    {
                        id: '6003605498820',
                        name: '골프공',
                    }
                ],
                targeting: {

                    gender: ['MALE', 'FEMALE'],
                    age: {
                        min: 20,
                        max: 60,
                    },
                    geolocation: {
                        useRadius: false,
                        radius: {
                            value: 5,
                            unit: 'kilometer',
                        },
                        included: [
                            {
                                key: 'JP',
                                name: 'Japan',
                                type: 'country',
                            },
                            {
                                key: 'KR',
                                name: 'South Korea',
                                type: 'country',
                            }
                        ],
                        excluded: [
                            {
                                key: '1268621',
                                name: 'Gwangju, Gwangju, South Korea',
                                type: 'city',
                            }
                        ],
                    },
                },
            }
        ],
        images: [
            {
                '1x1': 'https://i.ytimg.com/vi/y4-ZXUotFlA/maxresdefault.jpg',
                '1x141': 'https://i.ytimg.com/vi/y4-ZXUotFlA/maxresdefault.jpg',
                '1x191': 'https://i.ytimg.com/vi/y4-ZXUotFlA/maxresdefault.jpg',
            },
            {
                '1x1': 'http://channel.nationalgeographic.com/exposure/content/photo/photo/2095189_the-largest-carnivore-in-the-world_uensu6q222ogkowxa262qcibd3ggiqn63zkcn5eeuqux54zcfvtq_757x567.jpg',
                '1x141': 'http://channel.nationalgeographic.com/exposure/content/photo/photo/2095189_the-largest-carnivore-in-the-world_uensu6q222ogkowxa262qcibd3ggiqn63zkcn5eeuqux54zcfvtq_757x567.jpg',
                '1x191': 'http://channel.nationalgeographic.com/exposure/content/photo/photo/2095189_the-largest-carnivore-in-the-world_uensu6q222ogkowxa262qcibd3ggiqn63zkcn5eeuqux54zcfvtq_757x567.jpg',
            },
            {
                '1x1': 'http://cdn2.arkive.org/media/C4/C47A0B8A-6458-41B4-A657-3442AECBD887/Presentation.Large/Brown-bears-mating-Alaskan-population.jpg',
                '1x141': 'http://cdn2.arkive.org/media/C4/C47A0B8A-6458-41B4-A657-3442AECBD887/Presentation.Large/Brown-bears-mating-Alaskan-population.jpg',
                '1x191': 'http://cdn2.arkive.org/media/C4/C47A0B8A-6458-41B4-A657-3442AECBD887/Presentation.Large/Brown-bears-mating-Alaskan-population.jpg',
            }
        ],
        video: {
            url: 'https://s3-us-west-1.amazonaws.com/castr-images/videos/1505555120860.mp4',
            thumbnail: 'https://thumbnailer.mixcloud.com/unsafe/128x128/profile/4/b/c/a/c04a-e2d9-4404-9004-4e62e5dc048b',
        },
    };
}

const fullDayMilliseconds = 24 * 60 * 60 * 1000;

exports.timezone = tz => tzParser.parse(tz);
exports.locale = (loc) => {
    if (!locale[loc]) throw new Error('Invalid locale: Use either \'us\' or \'kr\' (eg. ?locale=us)');
    return locale[loc];
};
exports.fullDayMilliseconds = fullDayMilliseconds;
exports.koreanRegionMap = koreanRegionMap;
exports.getSamplePromotion = getSamplePromotion;
