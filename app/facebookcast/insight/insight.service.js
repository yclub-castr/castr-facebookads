// app/facebookcast/insight/insight.service.js

'use strict';

const utils = require('../../utils');
const constants = require('../../constants');
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
        const locale = params.locale;
        const summary = params.summary;
        try {
            let report;
            if (!mock) {
                // Fetch project
                const project = await ProjectModel.findOne({ castrBizId: castrBizId });
                if (!project) throw new Error(`No such Business (#${castrBizId})`);
                const timezone = project.timezone;
                const currency = project.currency;

                // Prepare date range
                let start;
                let end;
                if (!dateRange) {
                    logger.debug('Preparing default date range...');
                    end = moment.tz(timezone).hour(23).minute(59).second(59).millisecond(999);
                    start = moment(end).subtract(27, 'day').hour(0).minute(0).second(0).millisecond(0);
                } else {
                    logger.debug('Validating date range parameter...');
                    const dates = dateRange.split(',');
                    start = moment.tz(dates[0], timezone).hour(0).minute(0).second(0).millisecond(0);
                    end = moment.tz(dates[1], timezone).hour(23).minute(59).second(59).millisecond(999);
                    if (end.diff(start) < 0) {
                        throw new Error(`Invalid date range: endDate (${end.format('L')}) cannot be earlier than startDate (${start.format('L')})`);
                    }
                }

                // Prepare filtering param
                logger.debug('Preparing filters...');
                const query = {};
                if (castrBizId) query.castrBizId = castrBizId;
                if (castrLocId) query.castrLocId = castrLocId;
                if (promotionId) query.promotionId = promotionId;

                // Fetch insights
                const insightsQuery = Object.assign({}, query);
                insightsQuery.$and = [{ date: { $gte: start } }, { date: { $lte: end } }];
                const insightsRecords = await PlatformModel.find(query);
                const demographicRecords = await DemographicModel.find(query);

                if (!summary) {
                    // Format full insights report
                    // Count ads
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
                    const platformReport = Formatter.platform(insightsRecords, platformAds, timezone);
                    const demographicReport = Formatter.demographic(demographicRecords, locale);
                    report = {
                        platformReport: platformReport,
                        demographicReport: demographicReport,
                    };
                } else {
                    // Format summary report
                    const summaryReport = Formatter.summary(insightsRecords, demographicRecords, locale);
                    report = {
                        promotionName: null,
                        amountSpent: summaryReport.amountSpent,
                        currency: project.currency,
                        dateStart: moment.tz(start, timezone).locale(locale).format('L'),
                        dateEnd: moment.tz(end, timezone).locale(locale).format('L'),
                        locations: null,
                        optimizations: null,
                        budget: {
                            facebook: summaryReport.budget.facebook,
                            instagram: summaryReport.budget.instagram,
                            audienceNetwork: summaryReport.budget.audience_network,
                        },
                        reach: {
                            total: summaryReport.reach,
                            unitCost: (summaryReport.amountSpent / (summaryReport.reach / 1000)).toFixed(constants.currencyOffset(currency)),
                        },
                        impressions: {
                            total: summaryReport.impressions,
                            unitCost: (summaryReport.amountSpent / (summaryReport.impressions / 1000)).toFixed(constants.currencyOffset(currency)),
                        },
                        linkClicks: {
                            total: summaryReport.linkClicks,
                            unitCost: (summaryReport.amountSpent / summaryReport.linkClicks).toFixed(constants.currencyOffset(currency)),
                            rate: ((summaryReport.linkClicks / summaryReport.impressions) * 100).toFixed(constants.currencyOffset(2)),
                        },
                        purchases: {
                            total: summaryReport.purchases,
                            unitCost: (summaryReport.amountSpent / summaryReport.purchases).toFixed(constants.currencyOffset(currency)),
                            rate: ((summaryReport.purchases / summaryReport.linkClicks) * 100).toFixed(constants.currencyOffset(2)),
                        },
                        responses: {
                            total: summaryReport.responses.total,
                            addPaymentInfo: summaryReport.responses.addPaymentInfo,
                            addToCart: summaryReport.responses.addToCart,
                            addToWishlist: summaryReport.responses.addToWishlist,
                            completeRegistration: summaryReport.responses.completeRegistration,
                            initiateCheckout: summaryReport.responses.initiateCheckout,
                            lead: summaryReport.responses.lead,
                            search: summaryReport.responses.search,
                            viewContent: summaryReport.responses.viewContent,
                        },
                        genderAge: {
                            mostLinkClicks: summaryReport.genderAge.linkClicks
                                .filter(entry => entry.value !== 0)
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 4),
                            mostPurchases: summaryReport.genderAge.purchases
                                .filter(entry => entry.value !== 0)
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 4),
                        },
                        region: {
                            mostLinkClicks: summaryReport.region.linkClicks
                                .filter(entry => entry.value !== 0)
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 4),
                            mostPurchases: summaryReport.region.purchases
                                .filter(entry => entry.value !== 0)
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 4),
                        },
                        hour: {
                            mostLinkClicks: summaryReport.hour.linkClicks
                                .filter(entry => entry.value !== 0)
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 4),
                            mostPurchases: summaryReport.hour.purchases
                                .filter(entry => entry.value !== 0)
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 4),
                        },
                    };
                }
            } else {
                const demographicReport = {
                    impressions: {},
                    clicks: {},
                    linkClicks: {},
                    purchases: {},
                };
                const platformReport = Insight.Mock.platformReport();
                const genderAgeResp = Insight.Mock.genderAge();
                const regionResp = Insight.Mock.region();
                const hourResp = Insight.Mock.hour();
                Formatter.genderAge(demographicReport, genderAgeResp.data);
                Formatter.region(demographicReport, regionResp.data, locale);
                Formatter.hour(demographicReport, hourResp.data);
                report = {
                    platformReport: platformReport,
                    demographicReport: demographicReport,
                };
            }

            const msg = 'Insights returned';
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: report,
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
                    params.platformInsights = [];
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

                    // Fetch general insights
                    const generalParams = Object.assign({}, insightParams);
                    generalParams.fields = fields.platform;
                    let generalResponse;
                    do {
                        if (generalResponse) {
                            generalResponse = await fbRequest.get(generalResponse.paging.next, null, null, true);
                        } else {
                            generalResponse = await fbRequest.get(accountId, 'insights', generalResponse, true);
                        }
                        params.insights = params.insights.concat(generalResponse.body.data);
                        const utilization = JSON.parse(generalResponse.headers['x-fb-ads-insights-throttle']);
                        logger.debug(`Insights utilization (app: ${utilization.app_id_util_pct}, account: ${utilization.acc_id_util_pct})`);
                    } while (generalResponse.body.data.length > 0 && generalResponse.body.paging.next);

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
                        params.platformInsights = params.platformInsights.concat(platformResponse.body.data);
                        const utilization = JSON.parse(platformResponse.headers['x-fb-ads-insights-throttle']);
                        logger.debug(`Insights utilization (app: ${utilization.app_id_util_pct}, account: ${utilization.acc_id_util_pct})`);
                    } while (platformResponse.body.data.length > 0 && platformResponse.body.paging.next);

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
                    } while (genderAgeResponse.body.data.length > 0 && genderAgeResponse.body.paging.next);

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
                    } while (regionResponse.body.data.length > 0 && regionResponse.body.paging.next);

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
                    } while (hourResponse.body.data.length > 0 && hourResponse.body.paging.next);
                }
            } else {
                for (let i = 0; i < promotionParams.length; i++) {
                    const params = promotionParams[i];
                    const platformPromise = Insight.Mock.platform(params.timezone);
                    insightsRequests.push(platformPromise.then((fbResponse) => {
                        params.platformInsights = fbResponse;
                    }));
                }
                // Wait for all insights promises to resolve
                await Promise.all(insightsRequests);
            }

            const platformBulk = [];
            const demographicBulk = [];
            promotionParams.forEach((params) => {
                if (params.platformInsights.length > 0) {
                    params.platformInsights.forEach((insights) => {
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
                                value: this.getValue(insights, metric),
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

            const updatedPromotions = promotionParams.filter(params => params.platformInsights.length > 0);
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
