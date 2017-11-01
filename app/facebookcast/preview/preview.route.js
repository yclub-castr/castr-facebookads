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
            castrLocIds: req.query.castrLocIds.split(','),
            promotionId: req.query.promotionId,
            locale: locale(req.query.locale),
        };
        if (!params.castrBizId && !params.promotionId) {
            throw new Error('Missing params: must provide either `castrBizId` or `promotionId`');
        }
        if (!params.castrLocIds) throw new Error('Missing param: must provide \'castrLocIds\' (eg. ?castrLocIds=ID1,ID2,ID3)');
        res.json(await previewService.getPreviews(params));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
