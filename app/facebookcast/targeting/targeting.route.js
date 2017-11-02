// app/facebookcast/targeting/targeting.route.js

'use strict';

const express = require('express');
const locale = require('../../constants').locale;
const targetingService = require('./targeting.service');

const router = express.Router();

router.get('/predefined-interests', async (req, res, next) => {
    try {
        const params = {
            type: req.query.type,
            industryId: req.query.industryId,
            businessIds: req.query.businessIds,
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
        res.json(await targetingService.getPredefinedInterests(params));
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
        res.json(await targetingService.searchInterests(params));
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

// Not being used
router.get('/country', async (req, res, next) => {
    try {
        const params = {
            query: req.query.q,
            locale: locale(req.query.locale),
        };
        res.json(await targetingService.searchCountries(params));
    } catch (err) {
        next(err);
    }
});

// Not being used
router.get('/region', async (req, res, next) => {
    try {
        const params = {
            query: req.query.q,
            locale: locale(req.query.locale),
        };
        res.json(await targetingService.searchRegions(params));
    } catch (err) {
        next(err);
    }
});

// Not being used
router.get('/city', async (req, res, next) => {
    try {
        const params = {
            query: req.query.q,
            locale: locale(req.query.locale),
        };
        res.json(await targetingService.searchCities(params));
    } catch (err) {
        next(err);
    }
});

router.get('/location-sample', async (req, res, next) => {
    try {
        res.json(await targetingService.locationSample());
    } catch (err) {
        next(err);
    }
});

module.exports = router;
