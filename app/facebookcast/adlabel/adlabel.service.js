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
                    message: 'Batch requests failed 3 times',
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
                data: successes.map(response => JSON.parse(response.body)),
            };
        } catch (err) {
            throw err;
        }
    }

    async deleteAdLabels(accountId, adLabelIds) {
        logger.debug(`Deleting ad labels [${adLabelIds.toString()}] ...`);
        try {
            if (adLabelIds.length > 50) throw new Error('Too many labels to delete. Maximum # labels to delete at once: 50');
            let batchCompleted = false;
            const requests = adLabelIds.map(id => ({
                method: 'DELETE',
                relative_url: `${fbRequest.apiVersion}/${id}`,
            }));
            let attempts = 3;
            let fbResponses;
            do {
                logger.debug(`Batching ${adLabelIds.length} delete ad label requests...`);
                fbResponses = await fbRequest.batch(requests);
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
                    message: 'Batch requests failed 3 times',
                    data: fbResponses,
                };
            }
            logger.debug('FB batch-create successful');
            const successes = fbResponses.filter(response => response.code === 200);
            const msg = `${successes.length} ad labels deleted`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: successes.map(response => JSON.parse(response.body)),
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new AdService();
