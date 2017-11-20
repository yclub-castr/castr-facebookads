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
            if (!params.castrBizId && !params.promotionId) {
                // TODO: Find by castrLocId & campaignId
                throw new Error('Missing query params: must provide either `castrBizId` or `promotionId`');
            }
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
                targeting: req.body.targeting,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
            };
            if (!params.castrBizId) throw new Error('Missing body parameter: \'castrBizId\'');
            if (!params.castrLocId) throw new Error('Missing body parameter: \'castrLocId\'');
            if (!params.promotionId) throw new Error('Missing body parameter: \'promotionId\'');
            if (!params.campaignId) throw new Error('Missing body parameter: \'campaignId\'');
            if (!params.dailyBudget) throw new Error('Missing body parameter: \'dailyBudget\'');
            if (!params.billingEvent) throw new Error('Missing body parameter: \'billingEvent\'');
            if (!params.optimizationGoal) throw new Error('Missing body parameter: \'optimizationGoal\'');
            if (!params.targeting) throw new Error('Missing body parameter: \'targeting\'');
            if (!params.startDate) throw new Error('Missing body parameter: \'startDate\'');
            if (!params.endDate) throw new Error('Missing body parameter: \'endDate\'');
            res.json(await adsetService.createAdSet(params));
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
                adsetIds: req.body.adsetIds,
                parentsDeleted: req.body.parentsDeleted,
            };
            if (!params.castrBizId && !params.promotionId && !params.adsetIds) {
                throw new Error('Missing body params: must provide either `castrBizId` `promotionId` or `adsetIds`');
            }
            res.json(await adsetService.deleteAdSets(params));
        } catch (err) {
            next(err);
        }
    });


module.exports = router;
