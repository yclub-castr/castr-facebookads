// app/facebookcast/budget/budget.route.js

'use strict';

const express = require('express');
const budgetService = require('./budget.service');

const router = express.Router();

router.get('/daily-minimum', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            accountId: req.query.accountId,
            currency: req.query.currency,
            billingEvent: req.query.billingEvent,
        };
        if (!params.castrBizId) {
            if (!params.accountId) throw new Error('Missing params: must provide either `castrBizId` or `accountId`');
            if (!params.currency) throw new Error('Missing params: must provide `currency`');
        }
        if (!params.billingEvent) throw new Error('Missing params: must provide `billingEvent`');
        res.json(await budgetService.getMinimumBudget(params));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
