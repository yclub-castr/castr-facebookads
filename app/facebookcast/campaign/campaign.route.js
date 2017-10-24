// app/facebookcast/campaign/campaign.route.js

'use strict';

const express = require('express');
const campaignService = require('./campaign.service');

const router = express.Router();

router.route('/')
    .get(async (req, res, next) => {
        try {
            const params = {
                castrLocId: req.query.castrLocId,
                promotionId: req.query.promotionId,
            };
            res.json(await campaignService.getCampaigns(params));
        } catch (err) {
            next(err);
        }
    })
    .post(async (req, res, next) => {
        try {
            const params = {
                castrLocId: req.body.castrLocId,
                promotionId: req.body.promotionId,
                objective: req.body.objective,
            };
            res.json(await campaignService.createCampaign(params));
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
            res.json(await campaignService.deleteCampaigns(params));
        } catch (err) {
            next(err);
        }
    });


module.exports = router;
