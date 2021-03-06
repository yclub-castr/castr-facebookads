// app/facebookcast/targeting/targeting.route.js

'use strict';

const express = require('express');
const locale = require('../../constants').locale;
const constants = require('../../constants');
const targetingService = require('./targeting.service');

const router = express.Router();

router.get('/predefined-interests', async (req, res, next) => {
    try {
        const params = {
            type: req.query.type,
            industryId: req.query.industryId,
            businessIds: req.query.businessIds,
            locale: req.query.locale,
        };
        if (!params.type || !['INDUSTRY', 'BUSINESS', 'DETAIL'].includes(params.type)) {
            throw new Error('Missing query param: \'type\' must be provided and equal to either \'INDUSTRY\', \'BUSINESS\' or \'DETAIL\'');
        }
        if (params.type === 'BUSINESS' && !params.industryId) {
            throw new Error('Missing query param: \'industryId\' must be provided for (\'type\' == \'BUSINESS\')');
        }
        if (params.type === 'DETAIL') {
            if (!(params.industryId && params.businessIds)) {
                throw new Error('Missing query params: \'industryId\' and \'businessIds\' must be provided for (\'type\' == \'DETAIL\')');
            }
            params.businessIds = params.businessIds.split(',');
        }
        locale(params.locale); // Test validity of locale param
        res.json(await targetingService.getPredefinedInterests(params));
    } catch (err) {
        next(err);
    }
});

router.get('/keyword', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            accountId: req.query.accountId,
            query: req.query.q,
            locale: req.query.locale,
        };
        res.json(await targetingService.searchKeywords(params, { raw: req.query.raw, sort: req.query.sort }));
    } catch (err) {
        next(err);
    }
});

router.get('/interest', async (req, res, next) => {
    try {
        const params = {
            query: req.query.q,
            locale: locale(req.query.locale),
        };
        res.json(await targetingService.searchInterests(params, { raw: req.query.raw, sort: req.query.sort }));
    } catch (err) {
        next(err);
    }
});

router.get('/behavior', async (req, res, next) => {
    try {
        const params = {
            query: req.query.q,
            locale: locale(req.query.locale),
        };
        res.json(await targetingService.searchBehaviors(params, { raw: req.query.raw, sort: req.query.sort }));
    } catch (err) {
        next(err);
    }
});

router.get('/school', async (req, res, next) => {
    try {
        const params = {
            query: req.query.q,
            locale: locale(req.query.locale),
        };
        res.json(await targetingService.searchSchools(params, { raw: req.query.raw, sort: req.query.sort }));
    } catch (err) {
        next(err);
    }
});

router.get('/major', async (req, res, next) => {
    try {
        const params = {
            query: req.query.q,
            locale: locale(req.query.locale),
        };
        res.json(await targetingService.searchMajors(params, { raw: req.query.raw, sort: req.query.sort }));
    } catch (err) {
        next(err);
    }
});

router.get('/employer', async (req, res, next) => {
    try {
        const params = {
            query: req.query.q,
            locale: locale(req.query.locale),
        };
        res.json(await targetingService.searchEmployers(params, { raw: req.query.raw, sort: req.query.sort }));
    } catch (err) {
        next(err);
    }
});

router.get('/job', async (req, res, next) => {
    try {
        const params = {
            query: req.query.q,
            locale: locale(req.query.locale),
        };
        res.json(await targetingService.searchJobTitles(params, { raw: req.query.raw, sort: req.query.sort }));
    } catch (err) {
        next(err);
    }
});

router.get('/location', async (req, res, next) => {
    try {
        const params = {
            query: req.query.q,
            locale: locale(req.query.locale),
            type: req.query.type,
        };
        if (!['ALL', 'RC_ONLY'].includes(params.type)) {
            throw new Error('Missing param \'type\': must either be \'ALL\' or \'RC_ONLY\'');
        }
        res.json(await targetingService.searchLocations(params));
    } catch (err) {
        next(err);
    }
});

router.get('/radius', async (req, res, next) => {
    try {
        const params = {
            lat: req.query.lat,
            long: req.query.long,
            locale: locale(req.query.locale),
        };
        res.json(await targetingService.getSuggestedRadius(params));
    } catch (err) {
        next(err);
    }
});

router.get('/language', async (req, res, next) => {
    try {
        const params = {
            query: req.query.q,
            locale: locale(req.query.locale),
        };
        res.json(await targetingService.searchLanguages(params));
    } catch (err) {
        next(err);
    }
});

router.get('/connection', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
        };
        if (!params.castrBizId) throw new Error('Missing param: must provide \'castrBizId\'');
        res.json(await targetingService.getConnections(params));
    } catch (err) {
        next(err);
    }
});

router.get('/device', async (req, res, next) => {
    try {
        const params = {
            os: req.query.os,
            query: req.query.q,
            locale: locale(req.query.locale),
        };
        if (params.os && !constants.Os.hasOwnProperty(params.os)) throw new Error(`Invalid param: 'os' must be one of the following (${Object.keys(constants.Os)})`);
        res.json(await targetingService.searchDevices(params));
    } catch (err) {
        next(err);
    }
});

router.get('/os-versions', async (req, res, next) => {
    try {
        const params = {
            os: req.query.os,
            locale: locale(req.query.locale),
        };
        if (params.os && !constants.Os.hasOwnProperty(params.os)) throw new Error(`Invalid param: 'os' must be one of the following (${Object.keys(constants.Os)})`);
        res.json(await targetingService.searchOsVers(params));
    } catch (err) {
        next(err);
    }
});

router.get('/publisher-platforms', async (req, res, next) => {
    try {
        const params = {
            locale: req.query.locale,
        };
        res.json(await targetingService.getPublisherPlatforms(params));
    } catch (err) {
        next(err);
    }
});

router.get('/excluded-categories', async (req, res, next) => {
    try {
        const params = {
            locale: req.query.locale,
        };
        res.json(await targetingService.getPublisherCategories(params));
    } catch (err) {
        next(err);
    }
});

router.get('/location-sample', async (req, res, next) => {
    try {
        res.json(await targetingService.locationSample(req.query.castrLocId));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
