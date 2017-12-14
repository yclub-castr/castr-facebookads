// app/facebookcast/targeting/targeting.service.js

'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../../utils').logger();
const constants = require('../../constants');
const translation = require('../../translation');
const ProjectModel = require('../project/project.model').Model;
const fbRequest = require('../fbapi');
const Locale = require('../../constants').locale;

const Os = constants.Os;
const PublisherPlatform = constants.PublisherPlatform;
const FacebookPosition = constants.FacebookPosition;
const InstagramPosition = constants.InstagramPosition;
const AudienceNetworkPosition = constants.AudienceNetworkPosition;
const MessengerPosition = constants.MessengerPosition;
const PublisherCategory = constants.PublisherCategory;

const SEARCH_LIMIT = 1000;

function korLocDecoder(params) {
    const query = params.query;
    let transQuery;
    let locTypes;
    if (params.type === 'ALL') {
        locTypes = ['country', 'region', 'city'];
    } else if (params.type === 'RC_ONLY') {
        locTypes = ['region', 'city'];
    }
    if ((params.type !== 'RC_ONLY') && (query.includes('한국') || query.includes('대한민국'))) {
        transQuery = 'korea';
        locTypes = ['country'];
    } else if (query.includes('경기도')) {
        transQuery = 'Gyeonggi-do';
        locTypes = ['region'];
    } else if (query.includes('강원도')) {
        transQuery = 'Gangwon-do';
        locTypes = ['region'];
    } else if (query.includes('충청도')) {
        transQuery = '충청';
        // locTypes = ['region']; // Allow city search
    } else if (query.includes('충청남도') || query.includes('충남')) {
        transQuery = 'Chungcheongnam-do';
        locTypes = ['region'];
    } else if (query.includes('충청북도') || query.includes('충북')) {
        transQuery = 'Chungcheongbuk-do';
        locTypes = ['region'];
    } else if (query.includes('경상도')) {
        transQuery = '경상';
        // locTypes = ['region']; // Allow city search
    } else if (query.includes('경상남도') || query.includes('경남')) {
        transQuery = 'Gyeongsangnam-do';
        locTypes = ['region'];
    } else if (query.includes('경상북도') || query.includes('경북')) {
        transQuery = 'Gyeongsangbuk-do';
        locTypes = ['region'];
    } else if (query.includes('전라도')) {
        transQuery = '전라';
        // locTypes = ['region']; // Allow city search
    } else if (query.includes('전라남도') || query.includes('전남')) {
        transQuery = 'Jeollanam-do';
        locTypes = ['region'];
    } else if (query.includes('전라북도') || query.includes('전북')) {
        transQuery = 'Jeollabuk-do';
        locTypes = ['region'];
    } else if (query.includes('제주도')) {
        transQuery = 'Jeju-do';
        locTypes = ['region'];
    }
    return {
        type: 'adgeolocation',
        q: transQuery || params.query,
        location_types: locTypes,
        locale: params.locale,
        limit: 10,
    };
}

class TargetingService {
    async searchKeywords(params, options) {
        const castrBizId = params.castrBizId;
        let accountId = params.accountId;
        const query = params.query;
        const locale = params.locale;
        try {
            if (!accountId) {
                const project = await ProjectModel.findOne({ castrBizId: castrBizId });
                if (!project) throw new Error(`No such Business (#${castrBizId})`);
                accountId = project.accountId;
            }
            logger.debug(`Getting keywords for Business (#${castrBizId}) ...`);
            const fbResponse = await fbRequest.get(accountId, 'targetingbrowse', { locale: Locale(locale) });
            logger.debug(`${fbResponse.data.length} keywords found`);
            const queryFiltered = fbResponse.data.filter(keyword => keyword.name.match(new RegExp(query, 'gi')));
            logger.debug(`${queryFiltered.length} keywords match '${query}'`);
            const typeKeyMap = {};
            Object.keys(constants.KeywordType).forEach((key) => {
                typeKeyMap[constants.KeywordType[key]] = key;
            });
            const formatted = queryFiltered.map((keyword) => {
                if (options && options.raw) return keyword;
                return {
                    id: keyword.id,
                    name: keyword.name,
                    keywordType: translation.keywordTypeTrans[typeKeyMap[keyword.type]][locale],
                    type: typeKeyMap[keyword.type],
                    audienceSize: keyword.audience_size,
                };
            });
            let result;
            if (options && options.sort) result = formatted.sort((a, b) => parseInt(b.audienceSize, 10) - parseInt(a.audienceSize, 10));
            else result = formatted;
            return {
                success: true,
                message: `${result.length} keywords found`,
                data: result,
            };
        } catch (err) {
            throw err;
        }
    }

    async searchInterests(params, options) {
        const searchParams = {
            type: 'adinterest',
            q: params.query,
            locale: params.locale,
            limit: SEARCH_LIMIT,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} interests found for query (${params.query})`);
            const response = fbResponse.data.map((interest) => {
                if (options && options.raw) return interest;
                let name = interest.name;
                if (interest.disambiguation_category) {
                    name += `, ${interest.disambiguation_category}`;
                }
                return {
                    id: interest.id,
                    name: name,
                    audienceSize: interest.audience_size,
                };
            });
            if (options && options.sort) return response.sort((a, b) => parseInt(b.audienceSize, 10) - parseInt(a.audienceSize, 10));
            return response;
        } catch (err) {
            throw err;
        }
    }

    async searchBehaviors(params, options) {
        const query = params.query;
        const searchParams = {
            type: 'adTargetingCategory',
            class: 'behaviors',
            locale: params.locale,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} behaviors found`);
            const response = fbResponse.data.map((behavior) => {
                if (options && options.raw) return behavior;
                return {
                    id: behavior.id,
                    name: behavior.name,
                    audienceSize: behavior.audience_size,
                };
            });
            const queryFiltered = response.filter(behavior => behavior.name.match(new RegExp(query, 'gi')));
            logger.debug(`${queryFiltered.length} behaviors match query`);
            if (options && options.sort) return queryFiltered.sort((a, b) => parseInt(b.audienceSize, 10) - parseInt(a.audienceSize, 10));
            return queryFiltered;
        } catch (err) {
            throw err;
        }
    }

    async searchSchools(params, options) {
        const searchParams = {
            type: 'adeducationschool',
            q: params.query,
            locale: params.locale,
            limit: SEARCH_LIMIT,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} schools found for query (${params.query})`);
            const response = fbResponse.data.map((school) => {
                if (options && options.raw) return school;
                let name = school.name;
                if (school.disambiguation_category) {
                    name += `, ${school.disambiguation_category}`;
                }
                return {
                    id: school.id,
                    name: name,
                    audienceSize: school.audience_size,
                };
            });
            if (options && options.sort) return response.sort((a, b) => parseInt(b.audienceSize, 10) - parseInt(a.audienceSize, 10));
            return response;
        } catch (err) {
            throw err;
        }
    }

    async searchMajors(params, options) {
        const searchParams = {
            type: 'adeducationmajor',
            q: params.query,
            locale: params.locale,
            limit: SEARCH_LIMIT,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} majors found for query (${params.query})`);
            const response = fbResponse.data.map((major) => {
                if (options && options.raw) return major;
                let name = major.name;
                if (major.disambiguation_category) {
                    name += `, ${major.disambiguation_category}`;
                }
                return {
                    id: major.id,
                    name: name,
                    audienceSize: major.audience_size,
                };
            });
            if (options && options.sort) return response.sort((a, b) => parseInt(b.audienceSize, 10) - parseInt(a.audienceSize, 10));
            return response;
        } catch (err) {
            throw err;
        }
    }

    async searchEmployers(params, options) {
        const searchParams = {
            type: 'adworkemployer',
            q: params.query,
            locale: params.locale,
            limit: SEARCH_LIMIT,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} employers found for query (${params.query})`);
            const response = fbResponse.data.map((employer) => {
                if (options && options.raw) return employer;
                let name = employer.name;
                if (employer.disambiguation_category) {
                    name += `, ${employer.disambiguation_category}`;
                }
                return {
                    id: employer.id,
                    name: name,
                    audienceSize: employer.audience_size,
                };
            });
            if (options && options.sort) return response.sort((a, b) => parseInt(b.audienceSize, 10) - parseInt(a.audienceSize, 10));
            return response;
        } catch (err) {
            throw err;
        }
    }

    async searchJobTitles(params, options) {
        const searchParams = {
            type: 'adworkposition',
            q: params.query,
            locale: params.locale,
            limit: SEARCH_LIMIT,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} jobs found for query (${params.query})`);
            const response = fbResponse.data.map((job) => {
                if (options && options.raw) return job;
                let name = job.name;
                if (job.disambiguation_category) {
                    name += `, ${job.disambiguation_category}`;
                }
                return {
                    id: job.id,
                    name: name,
                    audienceSize: job.audience_size,
                };
            });
            if (options && options.sort) return response.sort((a, b) => parseInt(b.audienceSize, 10) - parseInt(a.audienceSize, 10));
            return response;
        } catch (err) {
            throw err;
        }
    }

    async searchLocations(params) {
        let searchParams;
        try {
            if (params.locale === 'ko_KR') {
                searchParams = korLocDecoder(params);
            } else {
                let locTypes;
                if (params.type === 'ALL') {
                    locTypes = ['country', 'region', 'city'];
                } else if (params.type === 'RC_ONLY') {
                    locTypes = ['region', 'city'];
                }
                searchParams = {
                    type: 'adgeolocation',
                    q: params.query,
                    location_types: locTypes,
                    locale: params.locale,
                    limit: 10,
                };
            }
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} [${searchParams.location_types}] found for query (${searchParams.q})`);
            const response = fbResponse.data.map((loc) => {
                let name = loc.name;
                if (loc.type === 'city') {
                    name += `, ${loc.region}, ${loc.country_name}`;
                } else if (loc.type === 'region') {
                    name += `, ${loc.country_name}`;
                }
                return {
                    key: loc.key,
                    name: name,
                    type: loc.type,
                };
            });
            return {
                success: true,
                message: `${response.length} locations found`,
                data: response,
            };
        } catch (err) {
            throw err;
        }
    }

    async searchLanguages(params) {
        const searchParams = {
            type: 'adlocale',
            q: params.query,
            locale: params.locale,
            limit: SEARCH_LIMIT,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} languages found for query (${params.query})`);
            const response = fbResponse.data.map(interest => ({
                key: interest.key,
                name: interest.name,
            }));
            return {
                success: true,
                message: `${response.length} langauges found`,
                data: response.sort((a, b) => parseInt(a.key, 10) - parseInt(b.key, 10)),
            };
        } catch (err) {
            throw err;
        }
    }

    async getConnections(params) {
        const castrBizId = params.castrBizId;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            return {
                success: true,
                message: null,
                data: [{
                    id: project.pageId,
                    name: project.pageName,
                    objType: 'PAGE',
                }],
            };
        } catch (err) {
            throw err;
        }
    }

    async searchDevices(params) {
        const os = Os[params.os];
        const query = params.query;
        const searchParams = {
            type: 'adTargetingCategory',
            class: 'user_device',
            locale: params.locale,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} devices found`);
            const response = fbResponse.data.map(device => ({
                platform: device.platform,
                name: device.name,
                audienceSize: device.audience_size,
            }));
            const platformFiltered = response.filter(device => !os || device.platform === os);
            logger.debug(`${platformFiltered.length} devices match platform`);
            const queryFiltered = platformFiltered.filter(device => device.name.match(new RegExp(query, 'gi')));
            logger.debug(`${queryFiltered.length} devices match query`);
            return {
                success: true,
                message: `${queryFiltered.length} ${os} devices found`,
                data: queryFiltered.sort((a, b) => parseInt(b.audienceSize, 10) - parseInt(a.audienceSize, 10)),
            };
        } catch (err) {
            throw err;
        }
    }

    async searchOsVers(params) {
        const os = Os[params.os];
        const searchParams = {
            type: 'adTargetingCategory',
            class: 'user_os',
            locale: params.locale,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} os found`);
            const response = fbResponse.data
                .filter(userOs => !os || userOs.platform === os)
                .map(userOs => ({
                    platform: userOs.platform,
                    list: userOs.description.split(';'),
                }));
            return {
                success: true,
                message: `${response.length} ${os} versions fetched`,
                data: response,
            };
        } catch (err) {
            throw err;
        }
    }

    async getPublisherPlatforms(params) {
        const locale = params.locale;
        try {
            const platforms = Object.keys(PublisherPlatform);
            const positions = {
                facebook: Object.keys(FacebookPosition),
                instagram: Object.keys(InstagramPosition),
                audienceNetwork: Object.keys(AudienceNetworkPosition),
                messenger: Object.keys(MessengerPosition),
            };
            const platformPositions = [];
            platforms.forEach((platform) => {
                const platformPosition = {
                    key: platform,
                    name: translation.platformPositionTrans[platform][locale],
                    positions: [],
                };
                positions[platform].forEach((position) => {
                    platformPosition.positions.push({
                        key: position,
                        name: translation.platformPositionTrans[position][locale],
                    });
                });
                platformPositions.push(platformPosition);
            });
            return {
                success: true,
                message: `${platformPositions.length} publisher platforms fetched`,
                data: platformPositions,
            };
        } catch (err) {
            throw err;
        }
    }

    async getPublisherCategories(params) {
        const locale = params.locale;
        try {
            const categories = Object.keys(PublisherCategory);
            return {
                success: true,
                message: `${categories.length} publisher categories fetched`,
                data: categories.map(category => ({
                    key: category,
                    name: translation.publisherCategoryTrans[category][locale],
                })),
            };
        } catch (err) {
            throw err;
        }
    }

    async getSuggestedRadius(params) {
        const distanceUnit = (params.locale === 'en_US') ? 'mile' : 'kilometer';
        const searchParams = {
            type: 'adradiussuggestion',
            latitude: params.lat,
            longitude: params.long,
            distance_unit: distanceUnit,
            locale: params.locale,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data[0].suggested_radius} ${distanceUnit} suggested around coordinate (${params.lat}, ${params.long})`);
            return fbResponse.data;
        } catch (err) {
            throw err;
        }
    }

    async getPredefinedInterests(params) {
        const type = params.type;
        const industryId = params.industryId;
        const businessIds = params.businessIds;
        const locale = params.locale;
        try {
            const dir = path.join(__dirname, 'interests', locale);
            let responseBucket = [];
            const files = fs.readdirSync(dir);
            for (let i = 0; i < files.length; i++) {
                const industry = Object.assign({}, require(path.join(dir, files[i]))); // eslint-disable-line
                if (type === 'INDUSTRY') {
                    delete industry.businessType;
                    responseBucket.push(industry);
                } else if (type === 'BUSINESS') {
                    if (industry.id === industryId) {
                        responseBucket = industry.businessType;
                        break;
                    }
                } else if (type === 'DETAIL') {
                    if (industry.id === industryId) {
                        const businessTypes = industry.businessType;
                        const flagged = [];
                        for (let j = 0; j < businessTypes.length; j++) {
                            const businessType = businessTypes[j];
                            if (businessIds.includes(businessType.id)) {
                                const keywords = businessType.keywords;
                                for (let k = 0; k < keywords.length; k++) {
                                    if (!flagged.includes(keywords[k].id)) {
                                        responseBucket.push(keywords[k]);
                                        flagged.push(keywords[k].id);
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
            }
            return {
                success: true,
                message: `Fetched ${responseBucket.length} ${type} options`,
                data: responseBucket,
            };
        } catch (err) {
            throw err;
        }
    }

    async locationSample(castrLocId) {
        return {
            _id: castrLocId || 'TEST_LOC_ID',
            castrBizId: 'TEST_BIZ_ID',
            promotionIds: ['TEST_PROMO_ID_1', 'TEST_PROMO_ID_2', 'TEST_PROMO_ID_3'],
            businessName: 'Business Name',
            displayName: 'Display Name',
            shortDesc: 'Location short description',
            longDesc: 'Location long description',
            message: 'Location message to customers',
            website: 'https://www.mixcloud.com/dondiablo/',
            address: {
                street: '31 Sector B',
                street2: 'Unit 58',
                city: 'Frontal Lobe',
                state: 'Brain',
                country: 'Kruger',
                lat: '25',
                long: '-71',
            },
            budgetOptimized: true,
            max4WkBudget: 10000,
            industryType: { id: '6003269553527', name: '스포츠' },
            businessType: [
                {
                    id: '6003510075864',
                    name: '골프',
                }
            ],
            businessTypeCustom: [],
            keywords: [
                {
                    id: '6003605498820',
                    name: '골프공',
                }
            ],
            keywordsCustom: [],
            competitors: [
                {
                    id: '6003344120039',
                    name: 'Titleist, 스포츠 및 레크리에이션',
                },
                {
                    id: '6003108439790',
                    name: 'Srixon, 아웃도어 및 스포츠 용품 회사',
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
                        unit: 'kilometer', // or 'mile'
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
        };
    }
}

module.exports = new TargetingService();
