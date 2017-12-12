// app/facebookcast/estimate/estimate.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const ProjectModel = require('../project/project.model').Model;
const AdSetModel = require('../adset/adset.model').Model;

class EstimateService {
    async getAdSetEstimate(params) {
        const adsetIds = params.adsetIds;
        const castrBizId = params.castrBizId;
        const fields = params.fields;
        let data;
        try {
            if (adsetIds) {
                const adsetIdArray = adsetIds.split(',');
                logger.debug(`Getting estimates for ${adsetIdArray.length} adsets...`);
                const adsets = await AdSetModel.find({ id: { $in: adsetIdArray } }, fields.join(' '));
                data = await Promise.all(adsets.map((adset) => {
                    const adsetId = adset.id;
                    const promise = fbRequest.get(adsetId, 'delivery_estimate', null, null, { key: castrBizId })
                        .then((estimateResponse) => {
                            logger.debug(`Adset (#${adset.id} estimate fetched`);
                            const adsetEstimate = adset.toObject();
                            adsetEstimate.estimate = estimateResponse.data[0];
                            return adsetEstimate;
                        });
                    return promise;
                }));
            } else {
                const adsetId = params.adsetId;
                logger.debug(`Getting estimates for adset (#${adsetId}) ...`);
                const fbResponse = await fbRequest.get(adsetId, 'delivery_estimate', null, null, { key: castrBizId });
                data = fbResponse.data[0];
            }
            return {
                success: true,
                message: null,
                data: data,
            };
        } catch (err) {
            throw err;
        }
    }

    async getAccountEstimate(params) {
        const castrBizId = params.castrBizId;
        const optimizationGoal = params.optimizationGoal;
        const promotedObject = params.promotedObject;
        const targetingSpec = params.targetingSpec;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            logger.debug(`Getting estimates for account (#${accountId}) ...`);
            const estimateParams = {
                optimization_goal: optimizationGoal,
                promoted_object: promotedObject,
                targeting_spec: targetingSpec,
            };
            const fbResponse = await fbRequest.get(accountId, 'delivery_estimate', estimateParams);
            return {
                success: true,
                message: null,
                data: fbResponse.data,
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new EstimateService();
