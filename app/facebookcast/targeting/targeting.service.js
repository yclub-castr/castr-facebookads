// app/facebookcast/targeting/targeting.service.js

'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');

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
    async searchInterests(params) {
        const searchParams = {
            type: 'adinterest',
            q: params.query,
            locale: params.locale,
            limit: 20,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} interests found for query (${params.query})`);
            const response = fbResponse.data.map((interest) => {
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
            return response.sort((a, b) => parseInt(b.audienceSize, 10) - parseInt(a.audienceSize, 10));
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
            return response;
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

    // Not being used
    async searchCountries(params) {
        const searchParams = {
            type: 'adgeolocation',
            q: params.query,
            location_types: ['country'],
            locale: params.locale,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} countries found for query (${params.query})`);
            return fbResponse.data;
        } catch (err) {
            throw err;
        }
    }

    // Not being used
    async searchRegions(params) {
        const searchParams = {
            type: 'adgeolocation',
            q: params.query,
            location_types: ['region'],
            locale: params.locale,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} regions found for query (${params.query})`);
            return fbResponse.data;
        } catch (err) {
            throw err;
        }
    }

    // Not being used
    async searchCities(params) {
        const searchParams = {
            type: 'adgeolocation',
            q: params.query,
            location_types: ['city'],
            locale: params.locale,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} cities found for query (${params.query})`);
            return fbResponse.data;
        } catch (err) {
            throw err;
        }
    }

    async generateTargetingSpec(castrLocid) {
        try {
            const i = 1;
            return (i > 2) ? null : null;
        } catch (err) {
            throw err;
        }
    }

    async locationSample(castrLocId) {
        const locationBasic = {
            businessName: 'Kruger\'s Mind Palace',
            displayName: 'KMP',
            shortDesc: 'Where thought happens...',
            longDesc: 'This is where Kruger does most of his thinking...',
            message: 'No loitering!',
            website: 'www.krugersmindpalace.com',
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
        };
        const locationDetail = {
            industryType: { id: '6003269553527', name: '스포츠' },
            businessType: [
                {
                    id: '6003510075864',
                    name: '골프',
                }
            ],
            keywords: [
                {
                    id: '6003605498820',
                    name: '골프공',
                }
            ],
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
        return {
            id: castrLocId || 'TEST_LOC_ID',
            castrBizId: 'TEST_BIZ_ID',
            promotionIds: ['TEST_PROMO_ID_1', 'TEST_PROMO_ID_2', 'TEST_PROMO_ID_3'],
            basic: locationBasic,
            detail: locationDetail,
        };
    }

    async getPredefinedInterests(params) {
        const type = params.type;
        const industryId = params.industryId;
        const businessIds = params.businessIds;
        try {
            const dir = path.join(__dirname, 'interests');
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
}

module.exports = new TargetingService();
