// app/facebookcast/adlabel/adlabel.route.js

'use strict';

const express = require('express');
const adlabelService = require('./adlabel.service');

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
            const accountId = req.body.accountId;
            const adLabelNames = req.body.adLabelNames;
            if (!accountId) throw new Error('Missing param: \'accountId\'');
            if (!adLabelNames) throw new Error('Missing param: \'adLabelNames\'');
            res.json(await adlabelService.createAdLabels(accountId, adLabelNames));
        } catch (err) {
            next(err);
        }
    })
    .delete(async (req, res, next) => {
        try {
            const accountId = req.body.accountId;
            const adLabelIds = req.body.adLabelIds;
            if (!accountId) throw new Error('Missing param: \'accountId\'');
            if (!adLabelIds) throw new Error('Missing param: \'adLabelIds\'');
            res.json(await adlabelService.deleteAdLabels(accountId, adLabelIds));
        } catch (err) {
            next(err);
        }
    });

module.exports = router;
