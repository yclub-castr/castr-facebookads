// app/facebookcast/estimate/estimate.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const ProjectModel = require('../project/project.model').Model;

class EstimateService {
    async getEstimate(params) {
        const castrBizId = params.castrBizId;
        const optimizationGoal = params.optimizationGoal;
        const promotedObject = params.promotedObject;
        const targetingSpec = params.targetingSpec;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            logger.debug(`Getting estimates for ${accountId}...`);
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
