// app/facebookcast/campaign/campaign.route.js

'use strict';

const express = require('express');
const campaignService = require('./campaign.service');

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
            res.json(await campaignService.getCampaigns(params));
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
                objective: req.body.objective,
            };
            if (!params.castrBizId) throw new Error('Missing body param: \'castrBizId\'');
            if (!params.castrLocId) throw new Error('Missing body param: \'castrLocId\'');
            if (!params.promotionId) throw new Error('Missing body param: \'promotionId\'');
            if (!params.objective) throw new Error('Missing body param: \'objective\'');
            res.json(await campaignService.createCampaign(params));
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
            res.json(await campaignService.deleteCampaigns(params));
        } catch (err) {
            next(err);
        }
    });


module.exports = router;
