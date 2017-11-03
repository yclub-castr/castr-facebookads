// app/facebookcast/adset/adset.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const PixelService = require('../pixel/pixel.service');
const Model = require('./adset.model');
const ProjectModel = require('../project/project.model').Model;

const AdSetModel = Model.Model;
const AdSetStatus = Model.Status;
const AdSetField = Model.Field;
const BillingEvent = Model.BillingEvent;
const OptimizationGoal = Model.OptimizationGoal;

const excludedFields = [
    AdSetField.adlabels,
    AdSetField.campaign,
    AdSetField.daily_imps,
    AdSetField.configured_status,
    AdSetField.execution_options
];
const readFields = Object.values(AdSetField).filter(field => !excludedFields.includes(field)).toString();

class AdSetService {
    async getAdSets(params) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            const adsetParams = { fields: readFields };
            let adsets;
            if (promotionId) {
                // TODO: implement paging-based GET
                const promotionlabels = project.adLabels.promotionLabels;
                for (let i = 0; i < promotionlabels.length; i++) {
                    if (promotionlabels[i].name === promotionId) {
                        logger.debug(`Fetching adsets by promotion id (#${promotionId}) ...`);
                        adsetParams.filtering = `[{"field":"adlabels","operator":"ANY","value":["${promotionId}"]}]`;
                        adsets = await fbRequest.get(accountId, 'adsets', adsetParams);
                        break;
                    }
                }
            } else if (castrBizId) {
                logger.debug(`Fetching adsets by business id (#${castrBizId}) ...`);
                adsetParams.filtering = `[{"field":"adlabels","operator":"ANY","value":["${castrBizId}"]}]`;
                adsets = await fbRequest.get(accountId, 'adsets', adsetParams);
            }
            if (!adsets) {
                throw new Error('Could not find ad label to read adsets');
            }
            const msg = `${adsets.data.length} adsets fetched`;
            logger.debug(msg);
            this.syncAdSets(adsets.data, castrBizId, promotionId);
            return {
                success: true,
                message: msg,
                data: adsets.data,
            };
        } catch (err) {
            throw err;
        }
    }

    async createAdSet(params) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        const campaignId = params.campaignId;
        const dailyBudget = params.dailyBudget;
        const billingEvent = params.billingEvent;
        const optimizationGoal = params.optimizationGoal;
        const startDate = params.startDate;
        const endDate = params.endDate;
        const isAutoBid = true;
        const targeting = params.targeting;
        const name = `AdSet [${optimizationGoal}]`;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            const businessLabel = project.adLabels.businessLabel;
            const locationLabel = project.adLabels.locationLabels.filter(label => label.name === castrLocId)[0];
            const promotionLabel = project.adLabels.promotionLabels.filter(label => label.name === promotionId)[0];
            const promotedObject = {
                pixel_id: (await PixelService.getPixel(project)).data.id,
                custom_event_type: 'PURCHASE',
            };
            const adsetParams = {
                [AdSetField.campaign_id]: campaignId,
                [AdSetField.adlabels]: [businessLabel, promotionLabel, locationLabel],
                [AdSetField.name]: name,
                [AdSetField.optimization_goal]: optimizationGoal,
                [AdSetField.targeting]: targeting,
                [AdSetField.daily_budget]: dailyBudget,
                [AdSetField.billing_event]: billingEvent,
                [AdSetField.is_autobid]: isAutoBid,
                [AdSetField.promoted_object]: promotedObject,
                [AdSetField.status]: AdSetStatus.active,
                [AdSetField.start_time]: startDate,
                [AdSetField.end_time]: endDate,
                [AdSetField.execution_options]: ['validate_only', 'include_recommendations'],
                [AdSetField.redownload]: true,
            };
            logger.debug(`Creating adset for promotion (#${promotionId}) ...`);
            const validation = await fbRequest.post(accountId, 'adsets', adsetParams);
            if (!validation.success) {
                const msg = 'Failed validation from Facebook';
                return {
                    success: false,
                    message: msg,
                    data: validation,
                };
            }
            delete adsetParams[AdSetField.execution_options];
            const fbResponse = await fbRequest.post(accountId, 'adsets', adsetParams);
            const adset = fbResponse.data.adsets[fbResponse.id];
            const msg = `AdSet (#${adset.id}) created`;
            logger.debug(msg);
            const model = new AdSetModel({
                castrBizId: castrBizId,
                castrLocId: castrLocId,
                promotionId: promotionId,
                accountId: adset.account_id,
                campaignId: adset.campaign_id,
                id: adset.id,
                name: adset.name,
                optimizationGoal: adset.optimization_goal,
                targeting: adset.targeting,
                status: adset.configured_status,
                effectiveStatus: adset.effective_status,
                dailyBudget: adset.daily_budget,
                billingEvent: adset.billing_event,
                isAutoBid: adset.is_autobid,
                startTime: adset.start_time,
                endTime: adset.end_time,
            });
            await model.save();
            logger.debug(`AdSet (#${adset.id}) stored to DB`);
            return {
                success: true,
                message: msg,
                data: {
                    castrBizId: castrBizId,
                    castrLocId: castrLocId,
                    promotionId: promotionId,
                    id: adset.id,
                    recommendations: validation.recommendations,
                },
            };
        } catch (err) {
            throw err;
        }
    }

    async deleteAdSets(params) {
        const castrBizId = params.castrBizId;
        const promotionId = params.promotionId;
        try {
            logger.debug('Fetching adsets for deletion...');
            let adsets;
            if (promotionId) {
                adsets = await AdSetModel.find({
                    promotionId: promotionId,
                    [AdSetField.status]: { $ne: [AdSetStatus.deleted] },
                }, 'id');
            } else if (castrBizId) {
                adsets = await AdSetModel.find({
                    castrBizId: castrBizId,
                    [AdSetField.status]: { $ne: [AdSetStatus.deleted] },
                }, 'id');
            }
            const adsetIds = adsets.map(adset => adset.id);
            const batches = [];
            let batchCompleted = false;
            const requests = adsetIds.map(id => ({
                method: 'DELETE',
                relative_url: `${fbRequest.apiVersion}/${id}`,
            }));
            let attempts = 3;
            let batchResponses;
            do {
                logger.debug(`Batching ${adsets.length} delete adset requests...`);
                for (let i = 0; i < Math.ceil(requests.length / 50); i++) {
                    batches.push(fbRequest.batch(requests.slice(i * 50, (i * 50) + 50)));
                }
                batchResponses = await Promise.all(batches);
                batchCompleted = true;
                for (let i = 0; i < batchResponses.length; i++) {
                    const fbResponses = batchResponses[i];
                    for (let j = 0; j < fbResponses.length; j++) {
                        if (fbResponses[i].code !== 200) {
                            logger.debug('One of batch requests failed, trying again...');
                            batchCompleted = false;
                            break;
                        }
                        if (!batchCompleted) break;
                    }
                }
                attempts -= 1;
            } while (!batchCompleted && attempts !== 0);
            if (!batchCompleted) {
                return {
                    success: false,
                    message: 'Batch requests failed 3 times',
                    data: batchResponses,
                };
            }
            logger.debug('FB batch-delete successful');
            const writeResult = await AdSetModel.updateMany(
                { id: { $in: adsetIds } },
                {
                    $set: {
                        status: AdSetStatus.deleted,
                        effectiveStatus: AdSetStatus.deleted,
                    },
                }
            );
            const msg = `${writeResult.nModified} adsets deleted`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: {},
            };
        } catch (err) {
            throw err;
        }
    }

    async syncAdSets(adsets, castrBizId, promotionId) {
        const promises = [];
        adsets.forEach((adset) => {
            const update = {
                campaignId: adset.campaign_id,
                id: adset.id,
                status: adset.status,
                effectiveStatus: adset.effective_status,
            };
            if (castrBizId) update.castrBizId = castrBizId;
            if (promotionId) update.promotionId = promotionId;
            promises.push(AdSetModel.updateOne(
                { id: adset.id },
                { $set: update },
                { upsert: true }
            ));
        });
        await Promise.all(promises);
        logger.debug(`Synchronized ${adsets.length} adsets`);
    }
}

module.exports = new AdSetService();
