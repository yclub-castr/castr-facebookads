// app/facebookcast/insight/insight.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const moment = require('../../utils').moment();
const ProjectModel = require('../project/project.model').Model;
const Insight = require('./insight.model');

const InsightField = Insight.Field;
const Breakdown = Insight.Breakdown;
const DatePreset = Insight.DatePreset;

const breakdowns = {
    platform: Breakdown.publisher_platform,
    genderAge: `${Breakdown.age},${Breakdown.gender}`,
    hour: Breakdown.hourly_stats_aggregated_by_advertiser_time_zone,
    region: Breakdown.region,
};

const fields = {
    platform: [InsightField.spend, InsightField.reach, InsightField.impressions, InsightField.clicks, InsightField.actions, InsightField.action_values],
    demographic: [InsightField.spend, InsightField.impressions, InsightField.clicks, InsightField.actions],
    // genderAge: [InsightField.spend, InsightField.impressions, InsightField.clicks, InsightField.actions],
    // hour: [InsightField.spend, InsightField.impressions, InsightField.clicks, InsightField.actions],
    // region: [InsightField.spend, InsightField.impressions, InsightField.clicks, InsightField.actions],
};

class InsightService {
    async getPromotionInsights(params, mock) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        const dateRange = params.dateRange;
        const insightParams = {};
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            const accountTimezone = project.timezone;

            // Preparing time range param
            if (!dateRange) {
                logger.debug('Preparing default \'date_preset\' parameter...');
                insightParams.date_preset = DatePreset.last_28d;
            } else {
                logger.debug('Validating \'dateRange\' parameter...');
                const dates = dateRange.split(',').map(date => moment(date).format('YYYY-MM-DD'));
                const start = dates[0];
                const end = dates[1];
                if (end.diff(start) < 0) {
                    throw new Error(`Invalid date range: endDate (${end.format('L')}) cannot be earlier than startDate (${start.format('L')})`);
                }
                insightParams.time_range = { since: start, until: end };
            }

            // Preparing filtering param
            logger.debug('Preparing \'filtering\' parameters...');
            const adlabels = [];
            if (castrBizId) adlabels.push(`"${castrBizId}"`);
            if (castrLocId) adlabels.push(`"${castrLocId}"`);
            if (promotionId) adlabels.push(`"${promotionId}"`);
            insightParams.filtering = `[ {"field": "campaign.adlabels","operator": "ALL","value": [${adlabels.join()}] } ]`;

            let genderAgeReport;
            if (!mock) {
                const genderAgeParams = Object.assign({}, insightParams);
                genderAgeParams.breakdowns = breakdowns.genderAge;
                genderAgeParams.fields = fields.demographic;
                genderAgeReport = await fbRequest.get(accountId, 'insights', genderAgeParams);
            } else {
                genderAgeReport = Insight.Mock.genderAge();
            }

            let regionReport;
            if (!mock) {
                const regionParams = Object.assign({}, insightParams);
                regionParams.breakdowns = breakdowns.region;
                regionParams.fields = fields.demographic;
                regionReport = await fbRequest.get(accountId, 'insights', regionParams);
            } else {
                regionReport = Insight.Mock.region();
            }

            let hourReport;
            if (!mock) {
                const hourParams = Object.assign({}, insightParams);
                hourParams.breakdowns = breakdowns.hour;
                hourParams.fields = fields.demographic;
                hourReport = await fbRequest.get(accountId, 'insights', hourParams);
            } else {
                hourReport = Insight.Mock.hour();
            }

            let platformReport;
            if (!mock) {
                const platformParams = Object.assign({}, insightParams);
                platformParams.breakdowns = breakdowns.platform;
                platformParams.fields = fields.platform;
                platformReport = await fbRequest.get(accountId, 'insights', platformParams);
            } else {
                platformReport = Insight.Mock.platform();
            }

            const msg = `Insights returned`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: {
                    platform: platformReport,
                    genderAge: genderAgeReport,
                    region: regionReport,
                    hour: hourReport,
                }
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new InsightService();
