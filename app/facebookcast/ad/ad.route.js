// app/facebookcast/ad/ad.route.js

'use strict';

const express = require('express');
const adService = require('./ad.service');

const router = express.Router();

router.route('/')
    .get(async (req, res, next) => {
        try {
            const params = {
                castrLocId: req.query.castrLocId,
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
                castrLocId: req.body.castrLocId,
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
                castrLocId: req.body.castrLocId,
                promotionId: req.body.promotionId,
            };
            res.json(await adService.deleteAds(params));
        } catch (err) {
            next(err);
        }
    });

module.exports = router;
