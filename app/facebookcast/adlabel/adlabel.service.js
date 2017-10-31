// app/facebookcast/adlabel/adlabel.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');

class AdService {
    async createAdLabels(accountId, adLabelNames) {
        logger.debug(`Generating ad labels [${adLabelNames.toString()}] ...`);
        try {
            if (adLabelNames.length > 50) throw new Error('Too many labels to create. Maximum # labels to create at once: 50');
            let batchCompleted = false;
            const requests = adLabelNames.map(name => ({
                method: 'POST',
                relative_url: `${fbRequest.apiVersion}/${accountId}/adlabels`,
                // body: `{"name":"${name}"}`,
                body: { name: name, fields: 'name' },
            }));
            let attempts = 3;
            let fbResponses;
            do {
                logger.debug(`Batching ${adLabelNames.length} create ad label requests...`);
                fbResponses = await fbRequest.batch(requests, true);
                batchCompleted = true;
                for (let i = 0; i < fbResponses.length; i++) {
                    if (fbResponses[i].code !== 200) {
                        logger.debug('One of batch requests failed, trying again...');
                        batchCompleted = false;
                        break;
                    }
                    if (!batchCompleted) break;
                }
                attempts -= 1;
            } while (!batchCompleted && attempts !== 0);
            if (!batchCompleted) {
                return {
                    success: false,
                    messasge: 'Batch requests failed 3 times',
                    data: fbResponses,
                };
            }
            logger.debug('FB batch-create successful');
            const successes = fbResponses.filter(response => response.code === 200);
            const msg = `${successes.length} ad labels created`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: successes.map(response => response.body),
            };
        } catch (err) {
            throw err;
        }
    }

    async deleteAdLabels(accountId, adlabelIds) {
        const castrBizId = params.castrBizId;
        const promotionId = params.promotionId;
        try {
            logger.debug('Fetching ads for deletion...');
            let ads;
            if (promotionId) {
                ads = await AdModel.find({
                    promotionId: promotionId,
                    [AdField.status]: { $ne: [AdStatus.deleted] },
                }, 'id');
            } else if (castrBizId) {
                ads = await AdModel.find({
                    castrBizId: castrBizId,
                    [AdField.status]: { $ne: [AdStatus.deleted] },
                }, 'id');
            } else {
                throw new Error('Missing params: must provide either `castrBizId` or `promotionId`');
            }
            const adIds = ads.map(adlabel => adlabel.id);
            const batches = [];
            let batchCompleted = false;
            const requests = adIds.map(id => ({
                method: 'DELETE',
                relative_url: `${fbRequest.apiVersion}/${id}`,
            }));
            let attempts = 3;
            let batchResponses;
            do {
                logger.debug(`Batching ${ads.length} delete adlabel requests...`);
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

    async syncAds(ads, castrBizId, promotionId) {
        const promises = [];
        ads.forEach((adlabel) => {
            const update = {
                campaignId: adlabel.campaign_id,
                id: adlabel.id,
                status: adlabel.status,
                effectiveStatus: adlabel.effective_status,
            };
            if (castrBizId) update.castrBizId = castrBizId;
            if (promotionId) update.promotionId = promotionId;
            promises.push(AdModel.updateOne(
                { id: adlabel.id },
                { $set: update },
                { upsert: true }
            ));
        });
        await Promise.all(promises);
        logger.debug(`Synchronized ${ads.length} ads`);
    }
}

module.exports = new AdService();
