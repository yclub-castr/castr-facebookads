// app/facebookcast/customaudience/customaudience.route.js

'use strict';

const express = require('express');
const customAudienceService = require('./customaudience.service');

const router = express.Router();

router.route('/')
    .get(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.query.castrBizId,
                accountId: req.query.accountId,
                detail: req.query.detail,
            };
            if (!(params.castrBizId || params.accountId)) throw new Error('Missing params: must provide either `castrBizId` or `accountId`');
            res.json(await customAudienceService.getCustomAudiences(params));
        } catch (err) {
            next(err);
        }
    // })
    // .post(async (req, res, next) => {
    //     try {
    //         const params = {
    //             castrBizId: req.query.castrBizId,
    //             accountId: req.query.accountId,
    //         };
    //         if (!(params.castrBizId || params.accountId)) throw new Error('Missing params: must provide either `castrBizId` or `accountId`');
    //         res.json(await customAudienceService.getCustomAudiences(params));
    //     } catch (err) {
    //         next(err);
    //     }
    });

module.exports = router;
