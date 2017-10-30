// app/facebookcast/adset/adset.route.js

'use strict';

const express = require('express');
const adsetService = require('./adset.service');

const router = express.Router();

router.route('/')
    .get(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.query.castrBizId,
                castrLocId: req.query.castrLocId,
                promotionId: req.query.promotionId,
                campaignId: req.query.campaignId,
            };
            res.json(await adsetService.getAdSets(params));
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
                dailyBudget: req.body.dailyBudget,
                billingEvent: req.body.billingEvent,
                optimizationGoal: req.body.optimizationGoal,
            };
            res.json(await adsetService.createAdSet(params));
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
            };
            res.json(await adsetService.deleteAdSets(params));
        } catch (err) {
            next(err);
        }
    });


module.exports = router;
