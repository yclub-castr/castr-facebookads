// app/facebookcast/targeting/targeting.service.js

'use strict';

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
    } else if (query.includes('경상남도') || query.includes('경북')) {
        transQuery = 'Gyeongsangnam-do';
        locTypes = ['region'];
    } else if (query.includes('경상북도') || query.includes('경남')) {
        transQuery = 'Gyeongsangbuk-do';
        locTypes = ['region'];
    } else if (query.includes('전라도')) {
        transQuery = '전라';
        // locTypes = ['region']; // Allow city search
    } else if (query.includes('전라남도') || query.includes('전북')) {
        transQuery = 'Jeollanam-do';
        locTypes = ['region'];
    } else if (query.includes('전라북도') || query.includes('전남')) {
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
    };
}

class TargetingService {
    async searchInterests(params) {
        const searchParams = {
            type: 'adinterest',
            q: params.query,
            locale: params.locale,
        };
        try {
            const fbResponse = await fbRequest.get('search', null, searchParams);
            logger.debug(`${fbResponse.data.length} interests found for query (${params.query})`);
            return fbResponse.data;
        } catch (err) {
            throw err;
        }
    }

    async searchLocations(params) {
        let searchParams;
        try {
            if (!['ALL', 'RC_ONLY'].includes(params.type)) {
                throw new Error('Missing param \'type\': must either be \'ALL\' or \'RC_ONLY\'');
            }
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
}

module.exports = new TargetingService();
