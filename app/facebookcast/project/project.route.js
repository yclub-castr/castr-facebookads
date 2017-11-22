// app/facebookcast/project/project.route.js

'use strict';

const express = require('express');
const projectService = require('./project.service');

const router = express.Router();

router.route('/account')
    .get(async (req, res, next) => {
        try {
            const params = {
                userId: req.query.userId,
                accessToken: req.query.accessToken,
            };
            res.json(await projectService.getAccounts(params));
        } catch (err) {
            next(err);
        }
    })
    .post(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.body.castrBizId,
                accountId: req.body.accountId,
                accountName: req.body.accountName,
                accessToken: req.body.accessToken,
            };
            res.json(await projectService.integrateAccount(params));
        } catch (err) {
            next(err);
        }
    })
    .delete(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.body.castrBizId,
                accountId: req.body.accountId,
            };
            res.json(await projectService.disintegrateAccount(params));
        } catch (err) {
            next(err);
        }
    });

router.get('/account/verify', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            accountId: req.query.accountId,
        };
        res.json(await projectService.verifyAccount(params));
    } catch (err) {
        next(err);
    }
});

router.route('/page')
    .get(async (req, res, next) => {
        try {
            const params = {
                userId: req.query.userId,
                accessToken: req.query.accessToken,
            };
            res.json(await projectService.getPages(params));
        } catch (err) {
            next(err);
        }
    })
    .post(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.body.castrBizId,
                pageId: req.body.pageId,
                pageName: req.body.pageName,
                pageAccessToken: req.body.pageAccessToken,
            };
            res.json(await projectService.integratePage(params));
        } catch (err) {
            next(err);
        }
    })
    .delete(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.body.castrBizId,
                pageId: req.body.pageId,
            };
            res.json(await projectService.disintegratePage(params));
        } catch (err) {
            next(err);
        }
    });

router.get('/page/verify', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            pageId: req.query.pageId,
            pageAccessToken: req.query.pageAccessToken,
        };
        if (!params.castrBizId) throw new Error('Missing param: \'castrBizId\' must be provided');
        if (!params.pageAccessToken) throw new Error('Missing param: \'pageAccessToken\' must be provided');
        res.json(await projectService.verifyPage(params));
    } catch (err) {
        next(err);
    }
});

router.get('/instagram', async (req, res, next) => {
    try {
        const params = {
            pageId: req.query.pageId,
            pageAccessToken: req.query.pageAccessToken,
        };
        if (!params.pageId) throw new Error('Missing param: \'pageId\' must be provided');
        if (!params.pageAccessToken) throw new Error('Missing param: \'pageAccessToken\' must be provided');
        res.json(await projectService.getInstagrams(params));
    } catch (err) {
        next(err);
    }
});

router.get('/payment-method/verify', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            accountId: req.query.accountId,
        };
        res.json(await projectService.verifyPaymentMethod(params));
    } catch (err) {
        next(err);
    }
});

router.route('/:castrBizId')
    .get(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.params.castrBizId,
            };
            res.json(await projectService.getProject(params));
        } catch (err) {
            next(err);
        }
    })
    .post(async (req, res, next) => {
        next({ message: 'Please integrate castr account with Facebook step-by-step using /account and /page routes' });
    })
    .delete(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.params.castrBizId,
            };
            res.json(await projectService.disintegrate(params));
        } catch (err) {
            next(err);
        }
    });

router.route('/:castrBizId/promotion')
    .post(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.params.castrBizId,
                castrLocIds: req.body.castrLocIds,
                promotionId: req.body.promotionId,
            };
            if (!params.castrBizId) throw new Error('Missing path variable: \'castrBizId\'');
            if (!params.castrLocIds) throw new Error('Missing body parameter: \'castrLocIds\'');
            if (!params.promotionId) throw new Error('Missing body parameter: \'promotionId\'');
            res.json(await projectService.newPromotion(params));
        } catch (err) {
            next(err);
        }
    })
    .delete(async (req, res, next) => {
        try {
            const params = {
                castrBizId: req.params.castrBizId,
                promotionId: req.body.promotionId,
            };
            if (!params.castrBizId) throw new Error('Missing path variable: \'castrBizId\'');
            if (!params.promotionId) throw new Error('Missing body parameter: \'promotionId\'');
            res.json(await projectService.removePromotion(params));
        } catch (err) {
            next(err);
        }
    });

router.get('/', async (req, res, next) => {
    try {
        res.json(await projectService.getActiveProjects());
    } catch (err) {
        next(err);
    }
});

module.exports = router;
