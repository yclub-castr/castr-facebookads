// app/facebookcast/pixel/pixel.route.js

'use strict';

const express = require('express');
const pixelService = require('./pixel.service');

const router = express.Router();

router.route('/')
    .get(async (req, res, next) => {
        try {
            const params = { castrLocId: req.query.castrLocId };
            res.json(await pixelService.getPixel(params));
        } catch (err) {
            next(err);
        }
    });

module.exports = router;