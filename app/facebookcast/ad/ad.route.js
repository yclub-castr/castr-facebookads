// app/facebookcast/ad/ad.route.js

'use strict';

const express = require('express');
const adService = require('./ad.service');

const router = express.Router();

router.route('/')
    .get(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.query.castrBizId,
                castrLocId: req.query.castrLocId,
                promotionId: req.query.promotionId,
                campaignId: req.query.campaignId,
                adsetId: req.query.adsetId,
            };
            if (!params.castrBizId && !params.promotionId) {
                // TODO: Find by castrLocId
                throw new Error('Missing query params: must provide either `castrBizId` or `promotionId`');
            }
            res.json(await adService.getAds(params));
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
                campaignId: req.body.campaignId,
                objective: req.body.objective,
                adsetId: req.body.adsetId,
                optimizationGoal: req.body.optimizationGoal,
                creatives: req.body.creatives,
            };
            if (!params.castrBizId) throw new Error('Missing body parameter: \'castrBizId\'');
            if (!params.castrLocId) throw new Error('Missing body parameter: \'castrLocId\'');
            if (!params.promotionId) throw new Error('Missing body parameter: \'promotionId\'');
            res.json(await adService.createAds(params));
        } catch (err) {
            next(err);
        }
    })
    .delete(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.body.castrBizId,
                castrLocId: req.body.castrLocId,
                promotionId: req.body.promotionId,
                adIds: req.body.adIds,
                parentsDeleted: req.body.parentsDeleted,
            };
            if (!params.adIds) {
                if (!(params.castrBizId && params.promotionId)) {
                    throw new Error('Missing body params: must provide either (`castrBizId` and `promotionId`) or `adIds`');
                }
            }
            res.json(await adService.deleteAds(params));
        } catch (err) {
            next(err);
        }
    });

router.route('/byCreativeIds')
    .get(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.query.castrBizId,
                castrLocId: req.query.castrLocId,
                promotionId: req.query.promotionId,
                creativeIds: req.query.creativeIds,
            };
            if (!params.castrBizId && !params.promotionId && !params.creativeIds) {
                throw new Error('Missing params: must provide either `castrBizId`, `promotionId` or `creativeIds`');
            }
            res.json(await adService.getAdsByCreativeIds(params));
        } catch (err) {
            next(err);
        }
    });

module.exports = router;
