// app/facebookcast/blocklist/blocklist.route.js

'use strict';

const express = require('express');
const blocklistService = require('./blocklist.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
        };
        if (!params.castrBizId) throw new Error('Missing params: must provide `castrBizId`');
        res.json(await blocklistService.getBlocklist(params));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
