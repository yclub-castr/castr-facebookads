// app/facebookcast/insight/insight.routes.js

'use strict';

const express = require('express');
const insightService = require('./insight.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            promotionIds: req.query.promotionIds,
            dateRange: req.query.dateRange,
        };
        res.json(await insightService.getPromotionInsights(params));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
