// app/facebookcast/campaign/campaign.route.js

'use strict';

const express = require('express');
const campaignService = require('./campaign.service');

const router = express.Router();

router.route('/')
    .get((req, res) => {
        campaignService.getCampaigns(req, res);
    })
    .post((req, res) => {
        campaignService.createCampaign(req, res);
    })
    .delete((req, res) => {
        campaignService.deleteCampaign(req, res);
    });


module.exports = router;
