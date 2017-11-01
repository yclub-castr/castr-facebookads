// app/facebookcast/preview/preview.route.js

'use strict';

const express = require('express');
const locale = require('../../constants').locale;
const previewService = require('./preview.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        if (!req.query.castrLocIds) throw new Error('Missing param: must provide \'castrLocIds\' (eg. ?castrLocIds=ID1,ID2,ID3)');
        if (!req.query.promotionIds) throw new Error('Missing param: must provide \'promotionIds\' (eg. ?promotionIds=ID1,ID2,ID3)');
        const params = {
            castrBizId: req.query.castrBizId,
            castrLocIds: req.query.castrLocIds.split(','),
            promotionIds: req.query.promotionIds.split(','),
            locale: locale(req.query.locale),
        };
        if (!params.castrBizId) throw new Error('Missing params: must provide `castrBizId`');
        res.json(await previewService.getPreviews(params));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
