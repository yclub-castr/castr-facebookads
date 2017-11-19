// app/facebookcast/insight/insight.service.js

'use strict';

const utils = require('../../utils');
const fbRequest = require('../fbapi');
const Project = require('../project/project.model');
const Insight = require('./insight.model');
const AdSet = require('../adset/adset.model');
const Ad = require('../ad/ad.model');

const logger = utils.logger();
const moment = utils.moment();

const ProjectModel = Project.Model;
const AdSetModel = AdSet.Model;
const AdModel = Ad.Model;
const InsightModel = Insight.Model;
const InsightField = Insight.Field;
const Breakdown = Insight.Breakdown;
const DatePreset = Insight.DatePreset;
const Formatter = Insight.Formatter;

const breakdowns = {
    platform: Breakdown.publisher_platform,
    genderAge: `${Breakdown.age},${Breakdown.gender}`,
    hour: Breakdown.hourly_stats_aggregated_by_advertiser_time_zone,
    region: Breakdown.region,
};

const fields = {
    platform: [InsightField.spend, InsightField.reach, InsightField.impressions, InsightField.clicks, InsightField.actions, InsightField.action_values].toString(),
    demographic: [InsightField.spend, InsightField.impressions, InsightField.clicks, InsightField.actions].toString(),
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
            let start;
            let end;
            if (!dateRange) {
                logger.debug('Preparing default \'date_preset\' parameter...');
                insightParams.date_preset = DatePreset.last_28d;
                end = moment.tz(accountTimezone).hour(23).minute(59).second(59).millisecond(999);
                start = moment(end).subtract(27, 'day').hour(0).minute(0).second(0).millisecond(0);
            } else {
                logger.debug('Validating \'dateRange\' parameter...');
                const dates = dateRange.split(',');
                start = moment.tz(dates[0], accountTimezone).hour(0).minute(0).second(0).millisecond(0);
                end = moment.tz(dates[1], accountTimezone).hour(23).minute(59).second(59).millisecond(999);
                if (end.diff(start) < 0) {
                    throw new Error(`Invalid date range: endDate (${end.format('L')}) cannot be earlier than startDate (${start.format('L')})`);
                }
                insightParams.time_range = { since: start, until: end };
            }

            // Preparing filtering param
            logger.debug('Preparing \'filtering\' parameters...');
            const query = {};
            const adlabels = [];
            if (castrBizId) {
                query.castrBizId = castrBizId;
                adlabels.push(`"${castrBizId}"`);
            }
            if (castrLocId) {
                query.castrLocId = castrLocId;
                adlabels.push(`"${castrLocId}"`);
            }
            if (promotionId) {
                query.promotionId = promotionId;
                adlabels.push(`"${promotionId}"`);
            }
            insightParams.filtering = `[ {"field": "campaign.adlabels","operator": "ALL","value": [${adlabels.join()}] } ]`;

            const platformAds = { facebook: 0, instagram: 0, audienceNetwork: 0 };
            const associatedAds = await AdModel.find(query);
            platformAds.total = associatedAds.length;
            const associatedAdsets = {};
            associatedAds.forEach((ad) => {
                if (!associatedAdsets[ad.adsetId]) associatedAdsets[ad.adsetId] = 1;
                else associatedAdsets[ad.adsetId] += 1;
            });
            const adsets = await AdSetModel.find({ id: { $in: Object.keys(associatedAdsets) } });
            adsets.forEach((adset) => {
                const platforms = adset.targeting.publisher_platforms;
                if (!platforms) {
                    platformAds.facebook += 1;
                    platformAds.instagram += 1;
                    platformAds.audienceNetwork += 1;
                } else {
                    platforms.forEach((platform) => {
                        if (platform === 'facebook') platformAds.facebook += 1;
                        else if (platform === 'instagram') platformAds.instagram += 1;
                        else if (platform === 'audience_network') platformAds.audienceNetwork += 1;
                    });
                }
            });

            let platformReport;
            let genderAgeResp;
            let regionResp;
            let hourResp;
            if (!mock) {
                query.$and = [{ date: { $gte: start } }, { date: { $lte: end } }];
                const insightsRecords = await InsightModel.find(query);
                platformReport = Formatter.platform(insightsRecords, platformAds, accountTimezone);

                const genderAgeParams = Object.assign({}, insightParams);
                genderAgeParams.breakdowns = breakdowns.genderAge;
                genderAgeParams.fields = fields.demographic;
                genderAgeResp = await fbRequest.get(accountId, 'insights', genderAgeParams);

                const regionParams = Object.assign({}, insightParams);
                regionParams.breakdowns = breakdowns.region;
                regionParams.fields = fields.demographic;
                regionResp = await fbRequest.get(accountId, 'insights', regionParams);

                const hourParams = Object.assign({}, insightParams);
                hourParams.breakdowns = breakdowns.hour;
                hourParams.fields = fields.demographic;
                hourResp = await fbRequest.get(accountId, 'insights', hourParams);
            } else {
                platformReport = Insight.Mock.platformReport();
                genderAgeResp = Insight.Mock.genderAge();
                regionResp = Insight.Mock.region();
                hourResp = Insight.Mock.hour();
            }

            const demoReport = {
                impressions: {},
                clicks: {},
                linkClicks: {},
                purchases: {},
            };
            Formatter.genderAge(demoReport, genderAgeResp.data);
            Formatter.region(demoReport, regionResp.data, params.locale);
            Formatter.hour(demoReport, hourResp.data);

            const msg = 'Insights returned';
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: {
                    platformReport: platformReport,
                    demoReport: demoReport,
                },
            };
        } catch (err) {
            throw err;
        }
    }

    async updatePromotionInsights(promotionParams, mock) {
        const insightParams = {
            breakdowns: breakdowns.platform,
            fields: fields.platform,
            data_preset: DatePreset.last_28d,
            time_increment: 1,
        };
        try {
            const insightsRequests = [];
            if (!mock) {
                for (let i = 0; i < promotionParams.length; i++) {
                    const params = promotionParams[i];
                    const adlabels = [];
                    adlabels[0] = `"${params.castrBizId}"`;
                    adlabels[1] = `"${params.castrLocId}"`;
                    adlabels[2] = `"${params.promotionId}"`;
                    insightParams.filtering = `[ {"field": "campaign.adlabels","operator": "ALL","value": [${adlabels.join()}] } ]`;
                    const insightPromise = fbRequest.get(params.accountId, 'insights', insightParams);
                    insightsRequests.push(insightPromise.then((fbResponse) => {
                        params.insights = fbResponse;
                    }));
                }
            } else {
                for (let i = 0; i < promotionParams.length; i++) {
                    const params = promotionParams[i];
                    const insightPromise = Insight.Mock.platform(params.timezone);
                    insightsRequests.push(insightPromise.then((fbResponse) => {
                        params.insights = fbResponse;
                    }));
                }
            }
            const platformResp = await Promise.all(insightsRequests);

            const bulkWrites = [];
            promotionParams.forEach((params) => {
                if (!params.insights) return;
                params.insights.data.forEach((insights) => {
                    const actions = {};
                    if (insights.actions) {
                        insights.actions.forEach((event) => {
                            if (event.action_type === 'link_click') actions.linkClicks = event.value;
                            else if (event.action_type === 'offsite_conversion.fb_pixel_add_payment_info') actions.addPaymentInfo = event.value;
                            else if (event.action_type === 'offsite_conversion.fb_pixel_add_to_cart') actions.addToCart = event.value;
                            else if (event.action_type === 'offsite_conversion.fb_pixel_add_to_wishlist') actions.addToWishlist = event.value;
                            else if (event.action_type === 'offsite_conversion.fb_pixel_complete_registration') actions.completeRegistration = event.value;
                            else if (event.action_type === 'offsite_conversion.fb_pixel_initiate_checkout') actions.initiateCheckout = event.value;
                            else if (event.action_type === 'offsite_conversion.fb_pixel_lead') actions.lead = event.value;
                            else if (event.action_type === 'offsite_conversion.fb_pixel_purchase') actions.purchase = event.value;
                            else if (event.action_type === 'offsite_conversion.fb_pixel_search') actions.search = event.value;
                            else if (event.action_type === 'offsite_conversion.fb_pixel_view_content') actions.viewContent = event.value;
                        });
                    }
                    const dateElems = insights.date_stop.split('-');
                    const date = moment.tz(params.timezone)
                        .year(dateElems[0]).month(dateElems[1] - 1).date(dateElems[2])
                        .hour(0).minute(0).second(0).millisecond(0);
                    bulkWrites.push({
                        updateOne: {
                            filter: {
                                date: date.toDate(),
                                castrBizId: params.castrBizId,
                                castrLocId: params.castrLocId,
                                promotionId: params.promotionId,
                                platform: insights.publisher_platform,
                            },
                            update: {
                                spend: insights.spend,
                                reach: insights.reach,
                                impressions: insights.impressions,
                                clicks: insights.clicks,
                                linkClicks: actions.linkClicks,
                                purchases: actions.purchase,
                                addPaymentInfo: actions.addPaymentInfo,
                                addToCart: actions.addToCart,
                                addToWishlist: actions.addToWishlist,
                                completeRegistration: actions.completeRegistration,
                                initiateCheckout: actions.initiateCheckout,
                                lead: actions.lead,
                                search: actions.search,
                                viewContent: actions.viewContent,
                            },
                            upsert: true,
                        },
                    });
                });
            });

            if (bulkWrites.length > 0) await InsightModel.bulkWrite(bulkWrites, { ordered: false });

            const msg = `${platformResp.length} promotions insights updated`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: [],
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new InsightService();
