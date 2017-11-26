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
const PlatformModel = Insight.Model;
const DemographicModel = Insight.DemographicModel;
const InsightField = Insight.Field;
const Breakdown = Insight.Breakdown;
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
        // const insightParams = {};
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            // const accountId = project.accountId;
            const accountTimezone = project.timezone;

            // Preparing time range param
            let start;
            let end;
            if (!dateRange) {
                logger.debug('Preparing default \'date_preset\' parameter...');
                // insightParams.date_preset = DatePreset.last_28d;
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
            }
            // insightParams.time_range = { since: start.format('YYYY-MM-DD'), until: end.format('YYYY-MM-DD') };

            // Preparing filtering param
            logger.debug('Preparing \'filtering\' parameters...');
            const query = {};
            // const adlabels = [];
            if (castrBizId) {
                query.castrBizId = castrBizId;
                // adlabels.push(`"${castrBizId}"`);
            }
            if (castrLocId) {
                query.castrLocId = castrLocId;
                // adlabels.push(`"${castrLocId}"`);
            }
            if (promotionId) {
                query.promotionId = promotionId;
                // adlabels.push(`"${promotionId}"`);
            }
            // insightParams.filtering = `[ {"field": "campaign.adlabels","operator": "ALL","value": [${adlabels.join()}] } ]`;

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
                    platformAds.facebook += associatedAdsets[adset.id];
                    platformAds.instagram += associatedAdsets[adset.id];
                    platformAds.audienceNetwork += associatedAdsets[adset.id];
                } else {
                    if (platforms.includes('facebook')) platformAds.facebook += associatedAdsets[adset.id];
                    if (platforms.includes('instagram')) platformAds.instagram += associatedAdsets[adset.id];
                    if (platforms.includes('audience_network')) platformAds.audienceNetwork += associatedAdsets[adset.id];
                }
            });

            let platformReport;
            let demographicReport;
            let genderAgeResp;
            let regionResp;
            let hourResp;
            if (!mock) {
                query.$and = [{ date: { $gte: start } }, { date: { $lte: end } }];
                const insightsRecords = await PlatformModel.find(query);
                platformReport = Formatter.platform(insightsRecords, platformAds, accountTimezone);

                const demographicRecords = await DemographicModel.find(query);
                demographicReport = Formatter.demographic(demographicRecords, platformAds, accountTimezone);
            } else {
                demographicReport = {
                    impressions: {},
                    clicks: {},
                    linkClicks: {},
                    purchases: {},
                };
                platformReport = Insight.Mock.platformReport();
                genderAgeResp = Insight.Mock.genderAge();
                regionResp = Insight.Mock.region();
                hourResp = Insight.Mock.hour();
                Formatter.genderAge(demographicReport, genderAgeResp.data);
                Formatter.region(demographicReport, regionResp.data, params.locale);
                Formatter.hour(demographicReport, hourResp.data);
            }

            const msg = 'Insights returned';
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: {
                    platformReport: platformReport,
                    demographicReport: demographicReport,
                },
            };
        } catch (err) {
            throw err;
        }
    }

    async updatePromotionInsights(promotionParams, mock) {
        const insightParams = {
            time_increment: 1,
        };
        try {
            const insightsRequests = [];
            if (!mock) {
                for (let i = 0; i < promotionParams.length; i++) {
                    const params = promotionParams[i];
                    const accountId = params.accountId;
                    params.insights = [];
                    params.demographicInsights = {
                        genderAge: [],
                        region: [],
                        hour: [],
                    };

                    // Prepare adlabel filtering
                    const adlabels = [`"${params.castrBizId}", "${params.castrLocId}", "${params.promotionId}"`];
                    insightParams.filtering = `[ {"field": "campaign.adlabels","operator": "ALL","value": [${adlabels.join()}] } ]`;

                    // Prepare last 28 day time query
                    const end = moment.tz(params.timezone).hour(23).minute(59).second(59).millisecond(999);
                    const start = moment(end).subtract(28, 'day').hour(0).minute(0).second(0).millisecond(0);
                    insightParams.time_range = { since: start.format('YYYY-MM-DD'), until: end.format('YYYY-MM-DD') };

                    // Fetch platform insights
                    const platformParams = Object.assign({}, insightParams);
                    platformParams.breakdowns = breakdowns.platform;
                    platformParams.fields = fields.platform;
                    let platformResponse;
                    do {
                        if (platformResponse) {
                            platformResponse = await fbRequest.get(platformResponse.paging.next, null, null, true);
                        } else {
                            platformResponse = await fbRequest.get(accountId, 'insights', platformParams, true);
                        }
                        params.insights = params.insights.concat(platformResponse.body.data);
                        const utilization = JSON.parse(platformResponse.headers['x-fb-ads-insights-throttle']);
                        logger.debug(`Insights utilization (app: ${utilization.app_id_util_pct}, account: ${utilization.acc_id_util_pct})`);
                    } while (platformResponse.body.paging.next);

                    // Fetch genderAge insights
                    const genderAgeParams = Object.assign({}, insightParams);
                    genderAgeParams.breakdowns = breakdowns.genderAge;
                    genderAgeParams.fields = fields.demographic;
                    let genderAgeResponse;
                    do {
                        if (genderAgeResponse) {
                            genderAgeResponse = await fbRequest.get(genderAgeResponse.body.paging.next, null, null, true);
                        } else {
                            genderAgeResponse = await fbRequest.get(accountId, 'insights', genderAgeParams, true);
                        }
                        params.demographicInsights.genderAge = params.demographicInsights.genderAge.concat(genderAgeResponse.body.data);
                        const utilization = JSON.parse(genderAgeResponse.headers['x-fb-ads-insights-throttle']);
                        logger.debug(`Insights utilization (app: ${utilization.app_id_util_pct}, account: ${utilization.acc_id_util_pct})`);
                    } while (genderAgeResponse.body.paging.next);

                    // Fetch region insights
                    const regionParams = Object.assign({}, insightParams);
                    regionParams.breakdowns = breakdowns.region;
                    regionParams.fields = fields.demographic;
                    let regionResponse;
                    do {
                        if (regionResponse) {
                            regionResponse = await fbRequest.get(regionResponse.body.paging.next, null, null, true);
                        } else {
                            regionResponse = await fbRequest.get(accountId, 'insights', regionParams, true);
                        }
                        params.demographicInsights.region = params.demographicInsights.region.concat(regionResponse.body.data);
                        const utilization = JSON.parse(regionResponse.headers['x-fb-ads-insights-throttle']);
                        logger.debug(`Insights utilization (app: ${utilization.app_id_util_pct}, account: ${utilization.acc_id_util_pct})`);
                    } while (regionResponse.body.paging.next);

                    // Fetch hour insights
                    const hourParams = Object.assign({}, insightParams);
                    hourParams.breakdowns = breakdowns.hour;
                    hourParams.fields = fields.demographic;
                    let hourResponse;
                    do {
                        if (hourResponse) {
                            hourResponse = await fbRequest.get(hourResponse.body.paging.next, null, null, true);
                        } else {
                            hourResponse = await fbRequest.get(accountId, 'insights', hourParams, true);
                        }
                        params.demographicInsights.hour = params.demographicInsights.hour.concat(hourResponse.body.data);
                        const utilization = JSON.parse(hourResponse.headers['x-fb-ads-insights-throttle']);
                        logger.debug(`Insights utilization (app: ${utilization.app_id_util_pct}, account: ${utilization.acc_id_util_pct})`);
                    } while (hourResponse.body.paging.next);
                }
            } else {
                for (let i = 0; i < promotionParams.length; i++) {
                    const params = promotionParams[i];
                    const platformtPromise = Insight.Mock.platform(params.timezone);
                    insightsRequests.push(platformtPromise.then((fbResponse) => {
                        params.insights = fbResponse;
                    }));
                }
            }
            // Wait for all insights promises to resolve
            await Promise.all(insightsRequests);

            const platformBulk = [];
            const demographicBulk = [];
            promotionParams.forEach((params) => {
                if (params.insights.length > 0) {
                    params.insights.forEach((insights) => {
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
                        platformBulk.push({
                            updateOne: {
                                filter: {
                                    date: date.toDate(),
                                    castrBizId: params.castrBizId,
                                    castrLocId: params.castrLocId,
                                    promotionId: params.promotionId,
                                    platform: insights.publisher_platform,
                                },
                                update: {
                                    spend: insights.spend || 0,
                                    reach: insights.reach || 0,
                                    impressions: insights.impressions || 0,
                                    clicks: insights.clicks || 0,
                                    linkClicks: actions.linkClicks || 0,
                                    purchases: actions.purchase || 0,
                                    addPaymentInfo: actions.addPaymentInfo || 0,
                                    addToCart: actions.addToCart || 0,
                                    addToWishlist: actions.addToWishlist || 0,
                                    completeRegistration: actions.completeRegistration || 0,
                                    initiateCheckout: actions.initiateCheckout || 0,
                                    lead: actions.lead || 0,
                                    search: actions.search || 0,
                                    viewContent: actions.viewContent || 0,
                                    timeUpdated: new Date(),
                                },
                                upsert: true,
                            },
                        });
                    });
                }
                const demoUpdate = {};
                if (params.demographicInsights.genderAge.length > 0) {
                    params.demographicInsights.genderAge.forEach((insights) => {
                        const bizId = params.castrBizId;
                        const locId = params.castrLocId;
                        const promoId = params.promotionId;
                        const date = insights.date_stop;
                        if (!demoUpdate[bizId]) demoUpdate[bizId] = {};
                        if (!demoUpdate[bizId][locId]) demoUpdate[bizId][locId] = {};
                        if (!demoUpdate[bizId][locId][promoId]) demoUpdate[bizId][locId][promoId] = {};
                        if (!demoUpdate[bizId][locId][promoId][date]) {
                            demoUpdate[bizId][locId][promoId][date] = {
                                impressions: {},
                                clicks: {},
                                linkClicks: {},
                                purchases: {},
                            };
                        }
                        Object.keys(demoUpdate[bizId][locId][promoId][date]).forEach((metric) => {
                            if (!demoUpdate[bizId][locId][promoId][date][metric].genderAge) {
                                demoUpdate[bizId][locId][promoId][date][metric].genderAge = {};
                            }
                            if (!demoUpdate[bizId][locId][promoId][date][metric].genderAge[insights.gender]) {
                                demoUpdate[bizId][locId][promoId][date][metric].genderAge[insights.gender] = {};
                            }
                            demoUpdate[bizId][locId][promoId][date][metric].genderAge[insights.gender][insights.age] = this.getValue(insights, metric);
                        });
                    });
                }
                if (params.demographicInsights.region.length > 0) {
                    params.demographicInsights.region.forEach((insights) => {
                        const bizId = params.castrBizId;
                        const locId = params.castrLocId;
                        const promoId = params.promotionId;
                        const date = insights.date_stop;
                        if (!demoUpdate[bizId]) demoUpdate[bizId] = {};
                        if (!demoUpdate[bizId][locId]) demoUpdate[bizId][locId] = {};
                        if (!demoUpdate[bizId][locId][promoId]) demoUpdate[bizId][locId][promoId] = {};
                        if (!demoUpdate[bizId][locId][promoId][date]) {
                            demoUpdate[bizId][locId][promoId][date] = {
                                impressions: {},
                                clicks: {},
                                linkClicks: {},
                                purchases: {},
                            };
                        }
                        Object.keys(demoUpdate[bizId][locId][promoId][date]).forEach((metric) => {
                            if (!demoUpdate[bizId][locId][promoId][date][metric].region) {
                                demoUpdate[bizId][locId][promoId][date][metric].region = [];
                            }
                            demoUpdate[bizId][locId][promoId][date][metric].region.push({
                                key: insights[Breakdown.region],
                                value: this.getValue(insights, metric)
                            });
                        });
                    });
                }
                if (params.demographicInsights.hour.length > 0) {
                    params.demographicInsights.hour.forEach((insights) => {
                        const bizId = params.castrBizId;
                        const locId = params.castrLocId;
                        const promoId = params.promotionId;
                        const date = insights.date_stop;
                        if (!demoUpdate[bizId]) demoUpdate[bizId] = {};
                        if (!demoUpdate[bizId][locId]) demoUpdate[bizId][locId] = {};
                        if (!demoUpdate[bizId][locId][promoId]) demoUpdate[bizId][locId][promoId] = {};
                        if (!demoUpdate[bizId][locId][promoId][date]) {
                            demoUpdate[bizId][locId][promoId][date] = {
                                impressions: {},
                                clicks: {},
                                linkClicks: {},
                                purchases: {},
                            };
                        }
                        Object.keys(demoUpdate[bizId][locId][promoId][date]).forEach((metric) => {
                            if (!demoUpdate[bizId][locId][promoId][date][metric].hour) {
                                demoUpdate[bizId][locId][promoId][date][metric].hour = {};
                            }
                            demoUpdate[bizId][locId][promoId][date][metric].hour[insights[Breakdown.hourly_stats_aggregated_by_advertiser_time_zone]] = this.getValue(insights, metric);
                        });
                    });
                }
                Object.keys(demoUpdate).forEach((bizId) => {
                    Object.keys(demoUpdate[bizId]).forEach((locId) => {
                        Object.keys(demoUpdate[bizId][locId]).forEach((promoId) => {
                            Object.keys(demoUpdate[bizId][locId][promoId]).forEach((date) => {
                                const dateElems = date.split('-');
                                const insightDate = moment.tz(params.timezone)
                                    .year(dateElems[0]).month(dateElems[1] - 1).date(dateElems[2])
                                    .hour(0).minute(0).second(0).millisecond(0);
                                demographicBulk.push({
                                    updateOne: {
                                        filter: {
                                            date: insightDate.toDate(),
                                            castrBizId: bizId,
                                            castrLocId: locId,
                                            promotionId: promoId,
                                        },
                                        update: {
                                            impressions: demoUpdate[bizId][locId][promoId][date].impressions,
                                            clicks: demoUpdate[bizId][locId][promoId][date].clicks,
                                            linkClicks: demoUpdate[bizId][locId][promoId][date].linkClicks,
                                            purchases: demoUpdate[bizId][locId][promoId][date].purchases,
                                            timeUpdated: new Date(),
                                        },
                                        upsert: true,
                                    },
                                });
                            });
                        });
                    });
                });
            });

            if (platformBulk.length > 0) await PlatformModel.bulkWrite(platformBulk, { ordered: false });
            if (demographicBulk.length > 0) await DemographicModel.bulkWrite(demographicBulk, { ordered: false });

            const updatedPromotions = promotionParams.filter(params => params.insights.length > 0);
            const msg = `${updatedPromotions.length} promotions insights updated`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: { updatedPromotions: updatedPromotions },
            };
        } catch (err) {
            throw err;
        }
    }

    getValue(insightObj, metric) {
        let value = 0;
        if (metric === 'impressions') {
            value = insightObj.impressions;
        } else if (metric === 'clicks') {
            value = insightObj.clicks;
        } else if (metric === 'linkClicks') {
            if (insightObj.actions) {
                for (let i = 0; i < insightObj.actions.length; i++) {
                    if (insightObj.actions[i].action_type === 'link_click') {
                        value = insightObj.actions[i].value;
                        break;
                    }
                }
            }
        } else if (metric === 'purchases') {
            if (insightObj.actions) {
                for (let i = 0; i < insightObj.actions.length; i++) {
                    if (insightObj.actions[i].action_type === 'offsite_conversion.fb_pixel_purchase') {
                        value = insightObj.actions[i].value;
                        break;
                    }
                }
            }
        }
        return parseInt(value, 10);
    }
}

module.exports = new InsightService();
