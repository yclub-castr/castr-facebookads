// app/facebookcast/insight/insight.routes.js

'use strict';

const express = require('express');
const insightService = require('./insight.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            castrLocId: req.query.castrLocId,
            promotionId: req.query.promotionId,
            dateRange: req.query.dateRange,
            locale: req.query.locale || 'us',
            summary: false,
        };
        if (!params.castrBizId && !params.castrLocId) throw new Error('Missing query param: must provide either \'castrBizId\' or \'castrLocId\'');
        if (params.dateRange && !params.dateRange.match(/^\d{8},\d{8}$/)) throw new Error('Invalid param: \'dateRange\' must be in correct format (YYYYMMDD,YYYYMMDD)');
        res.json(await insightService.getPromotionInsights(params, false));
    } catch (err) {
        next(err);
    }
});

router.get('/minimum', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            castrLocId: req.query.castrLocId,
            promotionIds: req.query.promotionIds,
            dateRange: req.query.dateRange,
        };
        if (!params.castrBizId && !params.castrLocId) throw new Error('Missing query param: must provide either \'castrBizId\' or \'castrLocId\'');
        if (params.dateRange && !params.dateRange.match(/^\d{8},\d{8}$/)) throw new Error('Invalid param: \'dateRange\' must be in correct format (YYYYMMDD,YYYYMMDD)');
        res.json(await insightService.getMinimumInsights(params));
    } catch (err) {
        next(err);
    }
});

router.get('/summary', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            castrLocId: req.query.castrLocId,
            promotionId: req.query.promotionId,
            dateRange: req.query.dateRange,
            locale: req.query.locale || 'us',
            summary: true,
        };
        if (!params.castrBizId && !params.castrLocId) throw new Error('Missing query param: must provide either \'castrBizId\' or \'castrLocId\'');
        if (params.dateRange && !params.dateRange.match(/^\d{8},\d{8}$/)) throw new Error('Invalid param: \'dateRange\' must be in correct format (YYYYMMDD,YYYYMMDD)');
        res.json(await insightService.getPromotionInsights(params, false));
    } catch (err) {
        next(err);
    }
});

router.get('/mock', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            castrLocId: req.query.castrLocId,
            promotionId: req.query.promotionId,
            dateRange: req.query.dateRange,
            locale: req.query.locale || 'us',
        };
        if (!params.castrBizId && !params.castrLocId) throw new Error('Missing query param: must provide either \'castrBizId\' or \'castrLocId\'');
        if (params.dateRange && !params.dateRange.match(/^\d{8},\d{8}$/)) throw new Error('Invalid param: \'dateRange\' must be in correct format (YYYYMMDD,YYYYMMDD)');
        res.json(await insightService.getPromotionInsights(params, true));
    } catch (err) {
        next(err);
    }
});

router.post('/update', async (req, res, next) => {
    try {
        const promotionParams = req.body.promotionParams;
        if (!promotionParams) throw new Error('Missing body param: must provide \'promotionParams\'');
        res.json(await insightService.updatePromotionInsights(promotionParams, false));
    } catch (err) {
        next(err);
    }
});

router.post('/update/mock', async (req, res, next) => {
    try {
        const promotionParams = req.body.promotionParams;
        if (!promotionParams) throw new Error('Missing body param: must provide \'promotionParams\'');
        res.json(await insightService.updatePromotionInsights(promotionParams, true));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
