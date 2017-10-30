// app/facebookcast/creative/creative.route.js

'use strict';

const express = require('express');
const creativeService = require('./creative.service');

const router = express.Router();

router.route('/')
    .get(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.query.castrBizId,
                castrLocId: req.query.castrLocId,
                promotionId: req.query.promotionId,
            };
            res.json(await creativeService.getCreatives(params));
        } catch (err) {
            next(err);
        }
    })
    .post(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.body.castrBizId,
                castrLocId: req.query.castrLocId,
                promotionId: req.body.promotionId,
            };
            res.json(await creativeService.createCreative(params));
        } catch (err) {
            next(err);
        }
    })
    .delete(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.body.castrBizId,
                castrLocId: req.query.castrLocId,
                promotionId: req.body.promotionId,
            };
            res.json(await creativeService.deleteCreatives(params));
        } catch (err) {
            next(err);
        }
    });


module.exports = router;
