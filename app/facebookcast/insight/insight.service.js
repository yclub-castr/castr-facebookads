// app/facebookcast/insight/insight.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const moment = require('../../utils').moment();
const InsightField = require('facebook-ads-sdk').AdsInsights.Field;
const ProjectModel = require('../project/project.model').Model;

// const readFields = [
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,
//     InsightField.,

// ].toString();

class InsightService {
    async getInsights(params) {
        const castrLocId = params.castrLocId;
        let promotionIds = params.promotionIds;
        let filtering;
        let dateRange = params.dateRange;
        try {
            const project = await ProjectModel.findOne({ castrLocId: castrLocId });
            const accountId = project.accountId;
            const accountTimezone = project.timezone;
            if (!dateRange) {
                const today = moment.tz(accountTimezone);
                dateRange = [moment(today).subtract(4, 'week').format('YYYYMMDD'), today.format('YYYYMMDD')];
            } else { dateRange = dateRange.split(','); }
            const timeRange = {
                since: moment.tz(dateRange[0], accountTimezone).format('YYYY-MM-DD'),
                until: moment.tz(dateRange[1], accountTimezone).format('YYYY-MM-DD'),
            };
            if (!promotionIds) {
                promotionIds = project.adLabels.promotionLabels.map(label => label.id);
            }
            filtering = `[{"field": "adgroup.adlabel_ids",
                "operator": "ANY",
                "value": ["<AD_LABEL_ID>"]
            }]`;
            // adParams.filtering = `[{"field":"adlabels","operator":"ANY","value":["${promotionId}"]}]`;

            // time_increment: 1
            const ageGender = await fbRequest(accountId, 'insights', {});


            // if (promotionId) {
            //     logger.debug(`Fetching creatives by promotion id (#${promotionId}) ...`);
            //     creatives = await CreativeModel.find({ promotionId: promotionId });
            // } else if (castrLocId) {
            //     logger.debug(`Fetching creatives by business id (#${castrLocId}) ...`);
            //     creatives = await CreativeModel.find({ castrLocId: castrLocId });
            // } else {
            //     throw new Error('Missing params: must provide either `castrLocId` or `promotionId`');
            // }

            const msg = `Preview sets fetched for ${null} creatives`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: null,
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new InsightService();
