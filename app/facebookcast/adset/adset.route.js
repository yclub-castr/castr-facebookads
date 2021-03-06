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
                objective: req.body.objective,
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
            if (!params.objective) throw new Error('Missing body parameter: \'objective\'');
            if (!params.dailyBudget) throw new Error('Missing body parameter: \'dailyBudget\'');
            if (!params.billingEvent) throw new Error('Missing body parameter: \'billingEvent\'');
            if (!params.optimizationGoal) throw new Error('Missing body parameter: \'optimizationGoal\'');
            if (!params.targeting) throw new Error('Missing body parameter: \'targeting\'');
            if (!params.startDate) throw new Error('Missing body parameter: \'startDate\'');
            if (!params.endDate && params.endDate !== 0) throw new Error('Missing body parameter: \'endDate\'');
            if (params.endDate !== 0 && params.startDate > params.endDate) throw new Error('Invalid dates: \'startDate\' cannot be greater than \'endDate\'');
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
                archive: req.body.archive,
                parentsDeleted: req.body.parentsDeleted,
            };
            if (!params.adsetIds) {
                if (!(params.castrBizId && params.promotionId)) {
                    throw new Error('Missing body params: must provide either (`castrBizId` and `promotionId`) or `adsetIds`');
                }
            }
            res.json(await adsetService.deleteAdSets(params));
        } catch (err) {
            next(err);
        }
    });

router.get('/db', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            castrLocId: req.query.castrLocId,
            promotionId: req.query.promotionId,
            campaignId: req.query.campaignId,
            fields: req.query.fields,
        };
        if (!params.castrBizId && !params.promotionId) {
            // TODO: Find by castrLocId & campaignId
            throw new Error('Missing query params: must provide either `castrBizId` or `promotionId`');
        }
        res.json(await adsetService.getAdSetsDb(params));
    } catch (err) {
        next(err);
    }
});

router.put('/optimize-budget', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.body.castrBizId,
            adsets: req.body.adsets,
        };
        if (!params.adsets) {
            throw new Error('Missing body param: must provide `adsets` (eg. [ [<adsetId>, newBudget], ... ])');
        }
        res.json(await adsetService.updateAdSets(params));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
