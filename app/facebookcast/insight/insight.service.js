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
//     InsightField., actions action_values
//     InsightField., spend
// hourly_stats_aggregated_by_advertiser_time_zone
// ].toString();region reach gender frequency age

const ageGender = {
    breakdown: `${InsightField.age},${InsightField.gender}`,
    fields: [
        // InsightField.age,
        // InsightField.gender,
        InsightField.impressions,
        InsightField.clicks
    ].toString(),
};

class InsightService {
    async getPromotionInsights(params) {
        const castrBizId = params.castrBizId;
        let promotionIds = params.promotionIds.split(',').map(id => `"${id}"`);
        let dateRange = params.dateRange;
        let filtering;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
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
                promotionIds = project.adLabels.promotionLabels.map(label => `"${label.name}"`);
            }
            filtering = `[ {"field": "campaign.adlabels","operator": "ANY","value": [${promotionIds.join()}] } ]`;
            // time_increment: 1
            const ageGenderReport = await fbRequest.get(accountId, 'insights', {
                breakdown: ageGender.breakdown,
                fields: ageGender.fields,
                filtering: filtering,
            });


            const msg = `Preview sets fetched for ${null} creatives`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: ageGenderReport,
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new InsightService();
