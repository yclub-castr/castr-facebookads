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
                promotionId: req.query.promotionId,
                campaignId: req.query.campaignId,
                adsetId: req.query.adsetId,
            };
            res.json(await adService.getAds(params));
        } catch (err) {
            next(err);
        }
    })
    .post(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.body.castrBizId,
                promotionId: req.body.promotionId,
                campaignId: req.query.campaignId,
                adsetId: req.body.adsetId,
                creatives: req.body.creatives,
            };
            res.json(await adService.createAds(params));
        } catch (err) {
            next(err);
        }
    })
    .delete(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.body.castrBizId,
                promotionId: req.body.promotionId,
            };
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
                promotionId: req.query.promotionId,
                creativeIds: req.query.creativeIds,
            };
            res.json(await adService.getAdsByCreativeIds(params));
        } catch (err) {
            next(err);
        }
    });

module.exports = router;
