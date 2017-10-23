// app/facebookcast/project/project.route.js

'use strict';

const express = require('express');
const projectService = require('./project.service');

const router = express.Router();

router.route('/account')
    .get((req, res, next) => {
        projectService.getAccounts(req, res, next);
    })
    .post((req, res, next) => {
        projectService.integrateAccount(req, res, next);
    })
    .delete((req, res, next) => {
        projectService.disintegrateAccount(req, res, next);
    });

router.get('/account/verify', (req, res, next) => {
    projectService.verifyAccount(req, res, next);
});

router.route('/page')
    .get((req, res, next) => {
        projectService.getPages(req, res, next);
    })
    .post((req, res, next) => {
        projectService.integratePage(req, res, next);
    })
    .delete((req, res, next) => {
        projectService.disintegratePage(req, res, next);
    });

router.get('/page/verify', (req, res, next) => {
    projectService.verifyPage(req, res, next);
});

router.get('/instagram', (req, res, next) => {
    projectService.getInstagrams(req, res, next);
});

router.get('/payment-method/verify', (req, res, next) => {
    projectService.verifyPaymentMethod(req, res, next);
});

router.route('/:castrLocId')
    .get((req, res, next) => {
        projectService.getProject(req, res, next);
    })
    .post((req, res, next) => {
        res.send({ message: 'Please integrate castr account with Facebook step-by-step using /account and /page routes' });
    })
    .delete((req, res, next) => {
        projectService.disintegrate(req, res, next);
    });

module.exports = router;
