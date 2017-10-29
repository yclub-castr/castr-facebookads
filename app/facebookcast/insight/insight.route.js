// app/facebookcast/insight/insight.routes.js

'use strict';

const express = require('express');
const insightService = require('./insight.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const params = {
            castrLocId: req.query.castrLocId,
            promotionIds: req.query.promotionIds,
            dateRange: req.query.dateRange,
        };
        res.json(await insightService.getInsights(params));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
