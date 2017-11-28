// app/facebookcast/campaign/campaign.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const Model = require('./campaign.model');
const ProjectModel = require('../project/project.model').Model;

const CampaignModel = Model.Model;
const CampaignStatus = Model.Status;
const CampaignField = Model.Field;
const CampaignObjective = Model.Objective;

const excludedFields = [CampaignField.execution_options];
const readFields = Object.values(CampaignField).filter(field => !excludedFields.includes(field)).toString();

const BATCH = false;

class CampaignService {
    async getCampaigns(params) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            const campaignParams = { fields: `${CampaignField.status},${CampaignField.effective_status}` };
            let campaigns;
            if (promotionId) {
                // TODO: implement paging-based GET
                const promotionlabels = project.adLabels.promotionLabels;
                for (let i = 0; i < promotionlabels.length; i++) {
                    if (promotionlabels[i].name === promotionId) {
                        logger.debug(`Fetching campaigns by promotion id (#${promotionId}) ...`);
                        campaignParams.filtering = `[{"field":"adlabels","operator":"ANY","value":["${promotionId}"]}]`;
                        campaigns = await fbRequest.get(accountId, 'campaigns', campaignParams);
                        break;
                    }
                }
            } else if (castrBizId) {
                logger.debug(`Fetching campaigns by business id (#${castrBizId}) ...`);
                campaignParams.filtering = `[{"field":"adlabels","operator":"ANY","value":["${castrBizId}"]}]`;
                campaigns = await fbRequest.get(accountId, 'campaigns', campaignParams);
            }
            if (!campaigns) {
                throw new Error('Could not find ad label to read campaigns');
            }
            const msg = `${campaigns.data.length} campaigns fetched`;
            logger.debug(msg);
            this.syncCampaigns(campaigns.data, castrBizId, promotionId);
            return {
                success: true,
                message: msg,
                data: campaigns.data,
            };
        } catch (err) {
            throw err;
        }
    }

    async createCampaign(params) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        const objective = params.objective;
        const name = `Campaign [${objective}]`;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            const businessLabel = project.adLabels.businessLabel;
            const locationLabel = project.adLabels.locationLabels.filter(label => label.name === castrLocId)[0];
            const promotionLabel = project.adLabels.promotionLabels.filter(label => label.name === promotionId)[0];
            const campaignParams = {
                [CampaignField.adlabels]: [businessLabel, locationLabel, promotionLabel],
                [CampaignField.name]: name,
                [CampaignField.objective]: objective,
                [CampaignField.budget_rebalance_flag]: true,
                [CampaignField.status]: CampaignStatus.paused,
                [CampaignField.execution_options]: ['validate_only', 'include_recommendations'],
                fields: readFields,
            };
            logger.debug(`Validating campaign for promotion (#${promotionId}) ...`);
            const validation = await fbRequest.post(accountId, 'campaigns', campaignParams);
            if (!validation.success) {
                const msg = 'Failed validation from Facebook';
                return {
                    success: false,
                    message: msg,
                    data: validation,
                };
            }
            delete campaignParams[CampaignField.execution_options];
            logger.debug(`Creating campaign for promotion (#${promotionId}) ...`);
            const campaign = await fbRequest.post(accountId, 'campaigns', campaignParams);
            const msg = `Campaign (#${campaign.id}) created`;
            logger.debug(msg);
            const model = new CampaignModel({
                castrBizId: castrBizId,
                castrLocId: castrLocId,
                promotionId: promotionId,
                accountId: campaign.account_id,
                id: campaign.id,
                name: campaign.name,
                objective: campaign.objective,
                status: campaign.configured_status,
                effectiveStatus: campaign.effective_status,
                buyingType: campaign.buying_type,
                budgetRebalanceFlag: campaign.budget_rebalance_flag,
                startTime: campaign.start_time,
                stopTime: campaign.stop_time,
            });
            await model.save();
            logger.debug(`Campaign (#${campaign.id}) stored to DB`);
            return {
                success: true,
                message: msg,
                data: {
                    castrBizId: castrBizId,
                    castrLocId: castrLocId,
                    promotionId: promotionId,
                    id: campaign.id,
                    name: campaign.name,
                    objective: campaign.objective,
                    recommendations: validation.recommendations,
                },
            };
        } catch (err) {
            throw err;
        }
    }

    async deleteCampaigns(params) {
        const castrBizId = params.castrBizId;
        const promotionId = params.promotionId;
        let campaignIds = params.campaignIds;
        const archive = params.archive;
        try {
            if (!campaignIds) {
                logger.debug('No campaign ids provided, fetching campaigns from DB for deletion...');
                const campaigns = await CampaignModel.find({
                    castrBizId: castrBizId,
                    promotionId: promotionId,
                    [CampaignField.status]: { $ne: CampaignStatus.deleted },
                }, 'id');
                campaignIds = campaigns.map(campaign => campaign.id);
            }
            if (BATCH) {
                let batchCompleted = false;
                let requests;
                if (archive) {
                    requests = campaignIds.map(id => ({
                        method: 'POST',
                        relative_url: `${fbRequest.apiVersion}/${id}`,
                        body: { status: CampaignStatus.archived },
                    }));
                } else {
                    requests = campaignIds.map(id => ({
                        method: 'DELETE',
                        relative_url: `${fbRequest.apiVersion}/${id}`,
                    }));
                }
                let attempts = 3;
                let batchResponses;
                do {
                    const batches = [];
                    logger.debug(`Batching ${campaignIds.length} ${(archive) ? 'archive' : 'delete'} campaign requests...`);
                    for (let i = 0; i < Math.ceil(requests.length / 50); i++) {
                        batches.push(fbRequest.batch(requests.slice(i * 50, (i * 50) + 50), archive));
                    }
                    batchResponses = await Promise.all(batches);
                    batchCompleted = true;
                    for (let i = 0; i < batchResponses.length; i++) {
                        const fbResponses = batchResponses[i];
                        for (let j = 0; j < fbResponses.length; j++) {
                            if (fbResponses[j].code !== 200) {
                                logger.debug('One of batch requests failed, trying again...');
                                batchCompleted = false;
                                break;
                            }
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
                logger.debug(`FB batch-${(archive) ? 'archive' : 'delete'} successful`);
            } else {
                const deletePromises = campaignIds.map(id => fbRequest.post(id, null, { status: CampaignStatus.archived }));
                await Promise.all(deletePromises);
            }
            const status = (archive) ? CampaignStatus.archived : CampaignStatus.deleted;
            const writeResult = await CampaignModel.updateMany(
                { id: { $in: campaignIds } },
                {
                    $set: {
                        status: status,
                        effectiveStatus: status,
                    },
                }
            );
            const msg = `${writeResult.nModified} campaigns ${(archive) ? 'archived' : 'deleted'}`;
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

    async syncCampaigns(campaigns, castrBizId, promotionId) {
        const promises = [];
        campaigns.forEach((campaign) => {
            const update = {
                id: campaign.id,
                status: campaign.status,
                effectiveStatus: campaign.effective_status,
            };
            if (castrBizId) update.castrBizId = castrBizId;
            if (promotionId) update.promotionId = promotionId;
            promises.push(CampaignModel.updateOne(
                { id: campaign.id },
                { $set: update },
                { upsert: true }
            ));
        });
        await Promise.all(promises);
        logger.debug(`Synchronized ${campaigns.length} campaigns`);
    }

    async activate(params) {
        const promotionId = params.promotionId;
        let campaignIds = params.campaignIds;
        try {
            if (!campaignIds) {
                logger.debug('Campaign ids not provided, fetching from DB...');
                const campaigns = await CampaignModel.find({ promotionId: promotionId, status: CampaignStatus.paused }, 'id');
                campaignIds = campaigns.map(campaign => campaign.id);
            }
            const campaignParams = {
                [CampaignField.status]: CampaignStatus.active,
                fields: [CampaignField.status, CampaignField.effective_status],
            };
            logger.debug(`Activating campaigns [${campaignIds.toString()}] ...`);
            const requests = campaignIds.map(id => ({
                method: 'POST',
                relative_url: `${fbRequest.apiVersion}/${id}`,
                body: campaignParams,
            }));
            const activations = await fbRequest.batch(requests, true);
            const bulkWrites = [];
            const activated = [];
            activations.forEach((fbResponse) => {
                if (fbResponse.code === 200) {
                    const campaign = JSON.parse(fbResponse.body);
                    activated.push(campaign.id);
                    bulkWrites.push({
                        updateOne: {
                            filter: { id: campaign.id },
                            update: {
                                status: campaign[CampaignField.status],
                                effectiveStatus: campaign[CampaignField.effective_status],
                            },
                        },
                    });
                }
            });
            if (bulkWrites.length > 0) await CampaignModel.bulkWrite(bulkWrites, { ordered: false });
            const msg = `${campaignIds.length} campaigns activated`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: { activated: activated },
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new CampaignService();
