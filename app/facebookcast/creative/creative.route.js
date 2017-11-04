// app/facebookcast/creative/creative.route.js

'use strict';

const express = require('express');
const creativeService = require('./creative.service');

const router = express.Router();

router.route('/')
    .get(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.query.castrBizId,
                castrLocId: req.query.castrLocId,
                promotionId: req.query.promotionId,
            };
            if (!params.castrBizId && !params.promotionId) {
                // TODO: Find by castrLocId
                throw new Error('Missing query params: must provide either `castrBizId` or `promotionId`');
            }
            res.json(await creativeService.getCreatives(params));
        } catch (err) {
            next(err);
        }
    })
    .post(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.body.castrBizId,
                castrLocId: req.body.castrLocId,
                promotionId: req.body.promotionId,
                params: req.body.params,
            };
            if (!params.castrBizId) throw new Error('Missing body parameter: \'castrBizId\'');
            if (!params.castrLocId) throw new Error('Missing body parameter: \'castrLocId\'');
            if (!params.promotionId) throw new Error('Missing body parameter: \'promotionId\'');
            if (!params.params) throw new Error('Missing body parameter: \'params\'');
            if (!params.params.locName) throw new Error('Missing body parameter: \'locName\'');
            if (!params.params.locDescShort) throw new Error('Missing body parameter: \'locDescShort\'');
            if (!params.params.locDescLong) throw new Error('Missing body parameter: \'locDescLong\'');
            if (!params.params.link) throw new Error('Missing body parameter: \'link\'');
            if (!params.params.promoTitle) throw new Error('Missing body parameter: \'promoTitle\'');
            if (!params.params.promoDesc) throw new Error('Missing body parameter: \'promoDesc\'');
            if (!params.params.promoImages) throw new Error('Missing body parameter: \'promoImages\' [url]');
            if (!params.params.promoVideo) throw new Error('Missing body parameter: \'promoVideo\' {url, thumbnail}');
            res.json(await creativeService.createCreative(params));
        } catch (err) {
            next(err);
        }
    })
    .delete(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.body.castrBizId,
                // castrLocId: req.body.castrLocId,
                promotionId: req.body.promotionId,
            };
            if (!params.castrBizId && !params.promotionId) {
                throw new Error('Missing body params: must provide either `castrBizId` or `promotionId`');
            }
            res.json(await creativeService.deleteCreatives(params));
        } catch (err) {
            next(err);
        }
    });


module.exports = router;
