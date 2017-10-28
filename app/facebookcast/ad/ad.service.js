// app/facebookcast/ad/ad.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const Model = require('./ad.model');
const ProjectModel = require('../project/project.model').Model;

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
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        try {
            const project = await ProjectModel.findOne({ castrLocId: castrLocId });
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
            } else if (castrLocId) {
                logger.debug(`Fetching ads by business id (#${castrLocId}) ...`);
                adParams.filtering = `[{"field":"adlabels","operator":"ANY","value":["${castrLocId}"]}]`;
                ads = await fbRequest.get(accountId, 'ads', adParams);
            } else {
                throw new Error('Missing params: must provide either `castrLocId` or `promotionId`');
            }
            if (!ads) {
                throw new Error('Could not find ad label to read ads');
            }
            const msg = `${ads.data.length} ads fetched`;
            logger.debug(msg);
            this.syncAds(ads.data, castrLocId, promotionId);
            return {
                success: true,
                message: msg,
                data: ads.data,
            };
        } catch (err) {
            throw err;
        }
    }

    async createAds(parmas) {
        const creatives = parmas.creatives;
        const adCreatePromises = [];
        logger.debug(`Generating ads from ${creatives.length} creatives...`);
        try {
            const project = await ProjectModel.findOne({ castrLocId: parmas.castrLocId });
            for (let i = 0; i < creatives.length; i++) {
                const adParams = {
                    project: project,
                    castrLocId: parmas.castrLocId,
                    promotionId: parmas.promotionId,
                    campaignId: parmas.campaignId,
                    adsetId: parmas.adsetId,
                    creative: parmas.creatives[i],
                };
                adCreatePromises.push(this.createAd(adParams));
            }
            const adResults = await Promise.all(adCreatePromises);
            const createdAds = adResults.filter(adResult => adResult.success);
            const msg = `${createdAds.length} ads created`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: adResults.map(adResult => adResult.data),
            };
        } catch (err) {
            throw err;
        }
    }

    async createAd(params) {
        let project = params.project;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        const campaignId = params.campaignId;
        const adsetId = params.adsetId;
        const creative = params.creative;
        const name = `Ad [${creative.name.match(/\[(.*)\]/)[1]}]`;
        try {
            if (!project) project = await ProjectModel.findOne({ castrLocId: castrLocId });
            const accountId = project.accountId;
            const businessLabel = project.adLabels.businessLabel.toObject();
            const promotionLabels = project.adLabels.promotionLabels;
            let promotionLabel;
            for (let i = 0; i < promotionLabels.length; i++) {
                if (promotionLabels[i].name === promotionId) {
                    promotionLabel = promotionLabels[i].toObject();
                }
            }
            const adParams = {
                [AdField.adlabels]: [businessLabel, promotionLabel],
                [AdField.campaign_id]: campaignId,
                [AdField.adset_id]: adsetId,
                [AdField.creative]: { creative_id: creative.id },
                [AdField.name]: name,
                [AdField.status]: AdStatus.active,
                [AdField.execution_options]: ['validate_only', 'include_recommendations', 'synchronous_ad_review'],
                [AdField.redownload]: true,
            };
            logger.debug(`Creating ad for promotion (#${promotionId}) ...`);
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
            const fbResponse = await fbRequest.post(accountId, 'ads', adParams);
            const ad = fbResponse.data.ads[fbResponse.id];
            const msg = `Ad (#${ad.id}) created`;
            logger.debug(msg);
            const model = new AdModel({
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
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        try {
            logger.debug('Fetching ads for deletion...');
            let ads;
            if (promotionId) {
                ads = await AdModel.find({
                    promotionId: promotionId,
                    [AdField.status]: { $ne: [AdStatus.deleted] },
                }, 'id');
            } else if (castrLocId) {
                ads = await AdModel.find({
                    castrLocId: castrLocId,
                    [AdField.status]: { $ne: [AdStatus.deleted] },
                }, 'id');
            } else {
                throw new Error('Missing params: must provide either `castrLocId` or `promotionId`');
            }
            const adIds = ads.map(ad => ad.id);
            const batches = [];
            let batchCompleted = false;
            const requests = adIds.map(id => ({
                method: 'DELETE',
                relative_url: `${fbRequest.apiVersion}/${id}`,
            }));
            let attempts = 3;
            let batchResponses;
            do {
                logger.debug(`Batching ${ads.length} delete ad requests...`);
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
                    messasge: 'Batch requests failed 3 times',
                    data: batchResponses,
                };
            }
            logger.debug('FB batch-delete successful');
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
                messasge: msg,
                data: {},
            };
        } catch (err) {
            throw err;
        }
    }

    async syncAds(ads, castrLocId, promotionId) {
        const promises = [];
        ads.forEach((ad) => {
            const update = {
                campaignId: ad.campaign_id,
                id: ad.id,
                status: ad.status,
                effectiveStatus: ad.effective_status,
            };
            if (castrLocId) update.castrLocId = castrLocId;
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
