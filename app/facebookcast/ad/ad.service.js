// app/facebookcast/ad/ad.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const Model = require('./ad.model');
const ProjectModel = require('../project/project.model').Model;
const Campaign = require('../campaign/campaign.model');
const CreativeModel = require('../creative/creative.model').Model;
const PixelService = require('../pixel/pixel.service');

const CampaignModel = Campaign.Model;
const CampaignObjective = Campaign.Objective;
const AdModel = Model.Model;
const AdStatus = Model.Status;
const AdField = Model.Field;

const excludedFields = [
    AdField.adlabels,
    AdField.campaign,
    AdField.adset,
    AdField.configured_status,
    AdField.execution_options
];
const readFields = Object.values(AdField).filter(field => !excludedFields.includes(field)).toString();

class AdService {
    async getAds(params) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            const adParams = { fields: readFields };
            let ads;
            if (promotionId) {
                // TODO: implement paging-based GET
                const promotionlabels = project.adLabels.promotionLabels;
                for (let i = 0; i < promotionlabels.length; i++) {
                    if (promotionlabels[i].name === promotionId) {
                        logger.debug(`Fetching ads by promotion id (#${promotionId}) ...`);
                        adParams.filtering = `[{"field":"adlabels","operator":"ANY","value":["${promotionId}"]}]`;
                        ads = await fbRequest.get(accountId, 'ads', adParams);
                        break;
                    }
                }
            } else if (castrBizId) {
                logger.debug(`Fetching ads by business id (#${castrBizId}) ...`);
                adParams.filtering = `[{"field":"adlabels","operator":"ANY","value":["${castrBizId}"]}]`;
                ads = await fbRequest.get(accountId, 'ads', adParams);
            }
            if (!ads) {
                throw new Error('Could not find ad label to read ads');
            }
            const msg = `${ads.data.length} ads fetched`;
            logger.debug(msg);
            this.syncAds(ads.data, castrBizId, promotionId);
            return {
                success: true,
                message: msg,
                data: ads.data,
            };
        } catch (err) {
            throw err;
        }
    }

    async getAdsByCreativeIds(params) {
        const castrBizId = params.castrBizId;
        const promotionId = params.promotionId;
        const creativeIds = params.creativeIds;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            const adParams = { fields: readFields };
            let ads;
            if (creativeIds) {
                logger.debug(`Fetching creatives for ids: ${creativeIds} ...`);
                const creatives = await CreativeModel.find({ id: { $in: creativeIds.split(',') } });
                const creativesNames = creatives.map(creative => `"${creative.name}"`);
                logger.debug(`Fetching ads by creative ids (#${creativeIds}) ...`);
                adParams.filtering = `[{"field":"adlabels","operator":"ANY","value":[${creativesNames.join()}]}]`;
                ads = await fbRequest.get(accountId, 'ads', adParams);
            } else if (promotionId) {
                // TODO: implement paging-based GET
                const promotionlabels = project.adLabels.promotionLabels;
                for (let i = 0; i < promotionlabels.length; i++) {
                    if (promotionlabels[i].name === promotionId) {
                        logger.debug(`Fetching ads by promotion id (#${promotionId}) ...`);
                        adParams.filtering = `[{"field":"adlabels","operator":"ANY","value":["${promotionId}"]}]`;
                        ads = await fbRequest.get(accountId, 'ads', adParams);
                        break;
                    }
                }
            } else if (castrBizId) {
                logger.debug(`Fetching ads by business id (#${castrBizId}) ...`);
                adParams.filtering = `[{"field":"adlabels","operator":"ANY","value":["${castrBizId}"]}]`;
                ads = await fbRequest.get(accountId, 'ads', adParams);
            }
            if (!ads) { throw new Error('Could not find ad label to read ads'); }
            const msg = `${ads.data.length} ads fetched`;
            logger.debug(msg);
            this.syncAds(ads.data, castrBizId, promotionId);
            return {
                success: true,
                message: msg,
                data: ads.data,
            };
        } catch (err) {
            throw err;
        }
    }

    async createAds(params) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        const campaignId = params.campaignId;
        const objective = params.objective;
        const adsetId = params.adsetId;
        const optimizationGoal = params.optimizationGoal;
        const creatives = params.creatives;
        const adCreatePromises = [];
        try {
            if (!creatives) throw new Error('Missing param: \'creatives\' must be provided');
            logger.debug(`Generating ads from ${creatives.length} creatives...`);
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            const businessLabel = project.adLabels.businessLabel;
            const locationLabel = project.adLabels.locationLabels.filter(label => label.name === castrLocId)[0];
            const promotionLabel = project.adLabels.promotionLabels.filter(label => label.name === promotionId)[0];
            for (let i = 0; i < creatives.length; i++) {
                const adParams = {
                    castrBizId: castrBizId,
                    castrLocId: castrLocId,
                    promotionId: promotionId,
                    accountId: accountId,
                    campaignId: campaignId,
                    objective: objective,
                    adsetId: adsetId,
                    optimizationGoal: optimizationGoal,
                    creative: creatives[i],
                    businessLabel: businessLabel,
                    locationLabel: locationLabel,
                    promotionLabel: promotionLabel,
                };
                if (objective !== CampaignObjective.conversions) {
                    adParams.pixelId = (await PixelService.getPixel(project)).data.id;
                }
                adCreatePromises.push(this.createAd(adParams));
            }
            const adResults = await Promise.all(adCreatePromises);
            const createdAds = adResults.filter(adResult => adResult.success);
            const msg = `${createdAds.length} ads created`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: {
                    castrBizId: castrBizId,
                    castrLocId: castrLocId,
                    promotionId: promotionId,
                    ads: adResults.map(adResult => adResult.data),
                },
            };
        } catch (err) {
            throw err;
        }
    }

    async createAd(params) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        const accountId = params.accountId;
        const campaignId = params.campaignId;
        const objective = params.objective;
        const adsetId = params.adsetId;
        const optimizationGoal = params.optimizationGoal;
        const creative = params.creative;
        const pixelId = params.pixelId;
        const name = `Ad [${objective},${optimizationGoal},${creative.name.match(/\[(.*)\]/)[1]}]`;
        const businessLabel = params.businessLabel;
        const locationLabel = params.locationLabel;
        const promotionLabel = params.promotionLabel;
        try {
            const adParams = {
                [AdField.adlabels]: [businessLabel, locationLabel, promotionLabel, { name: creative.adLabelName }],
                [AdField.campaign_id]: campaignId,
                [AdField.adset_id]: adsetId,
                [AdField.creative]: { creative_id: creative.id },
                [AdField.name]: name,
                [AdField.status]: AdStatus.active,
                [AdField.execution_options]: ['validate_only', 'include_recommendations', 'synchronous_ad_review'],
                [AdField.redownload]: true,
            };
            if (pixelId) {
                adParams[AdField.tracking_specs] = { 'action.type': ['offsite_conversion'], fb_pixel: [pixelId] };
            }
            logger.debug(`Validating ad for promotion (#${promotionId}) ...`);
            const validation = await fbRequest.post(accountId, 'ads', adParams);
            if (!validation.success) {
                const msg = 'Failed validation from Facebook';
                return {
                    success: false,
                    message: msg,
                    data: validation,
                };
            }
            delete adParams[AdField.execution_options];
            logger.debug(`Creating ad for promotion (#${promotionId}) ...`);
            const fbResponse = await fbRequest.post(accountId, 'ads', adParams);
            const ad = fbResponse.data.ads[fbResponse.id];
            const msg = `Ad (#${ad.id}) created`;
            logger.debug(msg);
            const model = new AdModel({
                castrBizId: castrBizId,
                castrLocId: castrLocId,
                promotionId: promotionId,
                accountId: ad.account_id,
                campaignId: ad.campaign_id,
                adsetId: ad.adset_id,
                id: ad.id,
                name: ad.name,
                creativeId: creative.id,
                bidType: ad.bid_type,
                status: ad.configured_status,
                effectiveStatus: ad.effective_status,
            });
            await model.save();
            logger.debug(`Ad (#${ad.id}) stored to DB`);
            return {
                success: true,
                message: msg,
                data: {
                    id: ad.id,
                    name: ad.name,
                    recommendations: validation.recommendations,
                },
            };
        } catch (err) {
            const msg = err.message;
            logger.error(msg);
            return {
                success: false,
                message: msg,
                data: err,
            };
        }
    }

    async deleteAds(params) {
        const castrBizId = params.castrBizId;
        const promotionId = params.promotionId;
        let adIds = params.adIds;
        try {
            if (!adIds) {
                logger.debug('No ad ids provided, fetching ads from DB for deletion...');
                const ads = await AdModel.find({
                    castrBizId: castrBizId,
                    promotionId: promotionId,
                    [AdField.status]: { $ne: AdStatus.deleted },
                }, 'id');
                adIds = ads.map(ad => ad.id);
            }
            if (!params.parentsDeleted) {
                let batchCompleted = false;
                const requests = adIds.map(id => ({
                    method: 'DELETE',
                    relative_url: `${fbRequest.apiVersion}/${id}`,
                }));
                let attempts = 3;
                let batchResponses;
                do {
                    const batches = [];
                    logger.debug(`Batching ${adIds.length} delete ad requests...`);
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
            }
            const writeResult = await AdModel.updateMany(
                { id: { $in: adIds } },
                {
                    $set: {
                        status: AdStatus.deleted,
                        effectiveStatus: AdStatus.deleted,
                    },
                }
            );
            const msg = `${writeResult.nModified} ads deleted`;
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

    async syncAds(ads, castrBizId, promotionId) {
        const promises = [];
        ads.forEach((ad) => {
            const update = {
                campaignId: ad.campaign_id,
                id: ad.id,
                status: ad.status,
                effectiveStatus: ad.effective_status,
            };
            if (castrBizId) update.castrBizId = castrBizId;
            if (promotionId) update.promotionId = promotionId;
            promises.push(AdModel.updateOne(
                { id: ad.id },
                { $set: update },
                { upsert: true }
            ));
        });
        await Promise.all(promises);
        logger.debug(`Synchronized ${ads.length} ads`);
    }
}

module.exports = new AdService();
