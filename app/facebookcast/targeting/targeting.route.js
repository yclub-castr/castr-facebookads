// app/facebookcast/targeting/targeting.route.js

'use strict';

const express = require('express');
const locale = require('../../constants').locale;
const targetingService = require('./targeting.service');

const router = express.Router();

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

module.exports = router;
