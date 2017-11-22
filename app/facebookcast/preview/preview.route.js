// app/facebookcast/preview/preview.route.js

'use strict';

const express = require('express');
const locale = require('../../constants').locale;
const previewService = require('./preview.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            castrLocIds: req.query.castrLocIds,
            promotionIds: req.query.promotionIds,
            platform: req.query.platform,
        };
        if (!params.castrBizId) throw new Error('Missing params: must provide `castrBizId`');
        if (req.query.locale) params.locale = locale(req.query.locale);
        res.json(await previewService.getPreviews(params));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
