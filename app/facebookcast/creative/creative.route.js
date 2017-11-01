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
            };
            if (!params.castrBizId) throw new Error('Missing body parameter: \'castrBizId\'');
            if (!params.castrLocId) throw new Error('Missing body parameter: \'castrLocId\'');
            if (!params.promotionId) throw new Error('Missing body parameter: \'promotionId\'');
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
