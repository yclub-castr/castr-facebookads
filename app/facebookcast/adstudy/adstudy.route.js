// app/facebookcast/adstudy/adstudy.route.js

'use strict';

const express = require('express');
const adstudyService = require('./adstudy.service');

const router = express.Router();

router.route('/')
    .get(async (req, res, next) => {
        try {
            throw new Error('Unsupported endpoint');
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
            };
            if (!params.castrBizId) throw new Error('Missing body parameter: \'castrBizId\'');
            // if (!params.castrLocId) throw new Error('Missing body parameter: \'castrLocId\'');
            if (!params.promotionId) throw new Error('Missing body parameter: \'promotionId\'');
            res.json(await adstudyService.createAdStudy(params));
        } catch (err) {
            next(err);
        }
    })
    .delete(async (req, res, next) => {
        try {
            const params = {
                adstudyId: req.body.adstudyId,
                castrBizId: req.body.castrBizId,
                castrLocId: req.body.castrLocId,
                promotionId: req.body.promotionId,
            };
            if (!params.castrBizId) throw new Error('Missing body parameter: \'castrBizId\'');
            if (!params.promotionId) throw new Error('Missing body parameter: \'promotionId\'');
            res.json(await adstudyService.deleteAdStudy(params));
        } catch (err) {
            next(err);
        }
    });


module.exports = router;
