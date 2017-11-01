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

class CampaignService {
    async getCampaigns(params) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
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
        const objective = params.objective || CampaignObjective.link_clicks;
        const name = `Campaign [${objective}]`;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            const accountId = project.accountId;
            const businessLabel = project.adLabels.businessLabel;
            const locationLabel = project.adLabels.locationLabels.filter(label => label.name === castrLocId)[0];
            const promotionLabel = project.adLabels.promotionLabels.filter(label => label.name === promotionId)[0];
            // if (!promotionLabel) {
            //     logger.debug('Promotion adlabel not found, creating new adlabel...');
            //     promotionLabel = await fbRequest.post(accountId, 'adlabels', { name: promotionId });
            //     logger.debug('Promotion adlabels created, storing in DB...');
            //     promotionLabels.push({ id: promotionLabel.id, name: promotionId });
            //     project.save();
            // }
            const campaignParams = {
                [CampaignField.adlabels]: [businessLabel, locationLabel, promotionLabel],
                [CampaignField.name]: name,
                [CampaignField.objective]: objective,
                [CampaignField.budget_rebalance_flag]: true,
                [CampaignField.status]: CampaignStatus.paused,
                [CampaignField.execution_options]: ['validate_only', 'include_recommendations'],
                fields: readFields,
            };
            logger.debug(`Creating campaign for promotion (#${promotionId}) ...`);
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
        try {
            logger.debug('Fetching campaigns for deletion...');
            let campaigns;
            if (promotionId) {
                campaigns = await CampaignModel.find({
                    promotionId: promotionId,
                    [CampaignField.status]: { $ne: [CampaignStatus.deleted] },
                }, 'id');
            } else if (castrBizId) {
                campaigns = await CampaignModel.find({
                    castrBizId: castrBizId,
                    [CampaignField.status]: { $ne: [CampaignStatus.deleted] },
                }, 'id');
            }
            const campaignIds = campaigns.map(campaign => campaign.id);
            const batches = [];
            let batchCompleted = false;
            const requests = campaignIds.map(id => ({
                method: 'DELETE',
                relative_url: `${fbRequest.apiVersion}/${id}`,
            }));
            let attempts = 3;
            let batchResponses;
            do {
                logger.debug(`Batching ${campaigns.length} delete campaign requests...`);
                for (let i = 0; i < Math.ceil(requests.length / 50); i++) {
                    batches.push(fbRequest.batch(requests.slice(i * 50, (i * 50) + 50)));
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
                        if (!batchCompleted) break;
                    }
                }
                attempts -= 1;
            } while (!batchCompleted && attempts !== 0);
            if (!batchCompleted) {
                return {
                    success: false,
                    messasge: 'Batch requests failed 3 times',
                    data: batchResponses,
                };
            }
            logger.debug('FB batch-delete successful');
            const writeResult = await CampaignModel.updateMany(
                { id: { $in: campaignIds } },
                {
                    $set: {
                        status: CampaignStatus.deleted,
                        effectiveStatus: CampaignStatus.deleted,
                    },
                }
            );
            const msg = `${writeResult.nModified} campaigns deleted`;
            logger.debug(msg);
            return {
                success: true,
                messasge: msg,
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
}

module.exports = new CampaignService();
