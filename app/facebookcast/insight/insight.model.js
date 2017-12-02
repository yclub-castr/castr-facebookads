// app/facebookcast/insight/insight.model.js

const fbCastDB = require('../../db').fbCastDB;
const mongoose = require('../../db').mongoose;
const utils = require('../../utils');
const constants = require('../../constants');
const Insight = require('facebook-ads-sdk').AdsInsights;

const Field = Insight.Field;
const Breakdown = Insight.Breakdowns;
const DatePreset = Insight.DatePreset;

const ages = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const genders = ['male', 'female', 'unknown'];
const platforms = ['facebook', 'audience_network', 'instagram'];
const regions = Object.keys(constants.koreanRegionMap);

const moment = utils.moment();
const RandomRatio = utils.RandomRatio;

exports.Field = Field;
exports.Breakdown = Breakdown;
exports.DatePreset = DatePreset;
exports.Model = fbCastDB.model(
    'Insight',
    new mongoose.Schema({
        date: { type: Date, required: true },
        castrBizId: { type: String, required: true },
        castrLocId: { type: String, required: true },
        promotionId: { type: String, required: true },
        platform: { type: String, enum: platforms, required: true },
        spend: Number,
        reach: Number,
        impressions: Number,
        clicks: Number,
        linkClicks: Number,
        purchases: Number,
        addPaymentInfo: Number,
        addToCart: Number,
        addToWishlist: Number,
        completeRegistration: Number,
        initiateCheckout: Number,
        lead: Number,
        search: Number,
        viewContent: Number,
        timeUpdated: { type: Date, required: true },
    })
);

exports.DemographicModel = fbCastDB.model(
    'Insight-Demographic',
    new mongoose.Schema({
        date: { type: Date, required: true },
        castrBizId: { type: String, required: true },
        castrLocId: { type: String, required: true },
        promotionId: { type: String, required: true },
        impressions: Object,
        clicks: Object,
        linkClicks: Object,
        purchases: Object,
        timeUpdated: { type: Date, required: true },
    })
);

const mockRandomMax = {
    spend: 500000,
    reach: 7500,
    impressions: 15000,
    clicks: 2000,
    linkClicks: 500,
    conversions: 50,
};

const mockGenderAge = () => {
    const random1 = new RandomRatio(genders.length * ages.length);
    const random2 = new RandomRatio(genders.length * ages.length);
    const random3 = new RandomRatio(genders.length * ages.length);
    const random4 = new RandomRatio(genders.length * ages.length);
    const response = [];
    for (let i = 0; i < genders.length; i++) {
        for (let j = 0; j < ages.length; j++) {
            const clickRatio = random3.next();
            response.push({
                gender: genders[i],
                age: ages[j],
                spend: Math.round(mockRandomMax.spend * random1.next()),
                impressions: Math.round(mockRandomMax.impressions * random2.next()),
                clicks: Math.round(mockRandomMax.clicks * clickRatio),
                actions: [
                    {
                        action_type: 'link_click',
                        value: Math.round(mockRandomMax.linkClicks * clickRatio),
                    },
                    {
                        action_type: 'offsite_conversion.fb_pixel_purchase',
                        value: Math.round(mockRandomMax.conversions * random4.next()),
                    }
                ],
            });
        }
    }
    return { data: response };
};

const mockHour = () => {
    const random1 = new RandomRatio(24);
    const random2 = new RandomRatio(24);
    const random3 = new RandomRatio(24);
    const random4 = new RandomRatio(24);
    const response = [];
    for (let i = 0; i < 24; i++) {
        const hh = `${(`0${i}`).slice(-2)}`;
        const range = `${hh}:00:00 - ${hh}:59:59`;
        const clickRatio = random3.next();
        response.push({
            hourly_stats_aggregated_by_advertiser_time_zone: range,
            spend: Math.round(mockRandomMax.spend * random1.next()),
            impressions: Math.round(mockRandomMax.impressions * random2.next()),
            clicks: Math.round(mockRandomMax.clicks * clickRatio),
            actions: [
                {
                    action_type: 'link_click',
                    value: Math.round(mockRandomMax.linkClicks * clickRatio),
                },
                {
                    action_type: 'offsite_conversion.fb_pixel_purchase',
                    value: Math.round(mockRandomMax.conversions * random4.next()),
                }
            ],
        });
    }
    return { data: response };
};

const mockRegion = () => {
    const random1 = new RandomRatio(regions.length);
    const random2 = new RandomRatio(regions.length);
    const random3 = new RandomRatio(regions.length);
    const random4 = new RandomRatio(regions.length);
    const response = [];
    for (let i = 0; i < regions.length; i++) {
        const clickRatio = random3.next();
        response.push({
            region: regions[i],
            spend: Math.round(mockRandomMax.spend * random1.next()),
            impressions: Math.round(mockRandomMax.impressions * random2.next()),
            clicks: Math.round(mockRandomMax.clicks * clickRatio),
            actions: [
                {
                    action_type: 'link_click',
                    value: Math.round(mockRandomMax.linkClicks * clickRatio),
                },
                {
                    action_type: 'offsite_conversion.fb_pixel_purchase',
                    value: Math.round(mockRandomMax.conversions * random4.next()),
                }
            ],
        });
    }
    return { data: response };
};

const mockPlatform = async (timezone) => {
    const randoms = [];
    for (let i = 0; i < 12; i++) randoms[i] = new RandomRatio(platforms.length * 28);
    const response = [];
    const endDate = moment.tz(timezone);
    for (let i = 0; i < platforms.length; i++) {
        for (let j = 27; j >= 0; j--) {
            const date = moment(endDate).subtract(j, 'day').format('YYYY-MM-DD');
            const impRatio = randoms[1].next();
            const clickRatio = randoms[2].next();
            response.push({
                date_start: date,
                date_stop: date,
                publisher_platform: platforms[i],
                spend: Math.round(mockRandomMax.spend * randoms[0].next()),
                reach: Math.round(mockRandomMax.reach * impRatio),
                impressions: Math.round(mockRandomMax.impressions * impRatio),
                clicks: Math.round(mockRandomMax.clicks * clickRatio),
                actions: [
                    {
                        action_type: 'link_click',
                        value: Math.round(mockRandomMax.linkClicks * clickRatio),
                    },
                    {
                        action_type: 'offsite_conversion.fb_pixel_add_payment_info',
                        value: Math.round(mockRandomMax.conversions * randoms[3].next()),
                    },
                    {
                        action_type: 'offsite_conversion.fb_pixel_add_to_cart',
                        value: Math.round(mockRandomMax.conversions * randoms[4].next()),
                    },
                    {
                        action_type: 'offsite_conversion.fb_pixel_add_to_wishlist',
                        value: Math.round(mockRandomMax.conversions * randoms[5].next()),
                    },
                    {
                        action_type: 'offsite_conversion.fb_pixel_complete_registration',
                        value: Math.round(mockRandomMax.conversions * randoms[6].next()),
                    },
                    {
                        action_type: 'offsite_conversion.fb_pixel_initiate_checkout',
                        value: Math.round(mockRandomMax.conversions * randoms[7].next()),
                    },
                    {
                        action_type: 'offsite_conversion.fb_pixel_lead',
                        value: Math.round(mockRandomMax.conversions * randoms[8].next()),
                    },
                    {
                        action_type: 'offsite_conversion.fb_pixel_purchase',
                        value: Math.round(mockRandomMax.conversions * randoms[9].next()),
                    },
                    {
                        action_type: 'offsite_conversion.fb_pixel_search',
                        value: Math.round(mockRandomMax.conversions * randoms[10].next()),
                    },
                    {
                        action_type: 'offsite_conversion.fb_pixel_view_content',
                        value: Math.round(mockRandomMax.conversions * randoms[11].next()),
                    }
                ],
            });
        }
    }
    return { data: response };
};

const getXValues = (timezone) => {
    const x = [];
    const endDate = moment.tz(timezone).hour(0).minute(0).second(0).millisecond(0);
    for (let i = 27; i >= 0; i--) {
        x.push(moment(endDate).subtract(i, 'day').format('MM/DD'));
    }
    return x;
};

const getYValues = (lines) => {
    const y = { total: [] };
    const labels = [];
    for (let i = 0; i < lines.length; i++) {
        const label = lines[i][0];
        labels.push(label);
        y[label] = new RandomRatio(27).distribute(lines[i][1]);
    }
    for (let i = 0; i < 27; i++) {
        let total = 0;
        labels.forEach((label) => {
            total += y[label][i];
        });
        y.total.push(total);
    }
    return Object.keys(y).map(key => ({ label: key, data: y[key] }));
};

const mockPlatformReport = (timezone) => {
    const response = {
        numPromotions: 2,
        numAds: 144,
        impressions: mockRandomMax.impressions,
        clicks: mockRandomMax.clicks,
        linkClicks: mockRandomMax.linkClicks,
        purchases: mockRandomMax.conversions,
        responses: mockRandomMax.conversions * 8,
        amountSpent: mockRandomMax.spend,
        promotions: {
            TEST_PROMO_ID_1: {
                numAds: 72,
                impressions: mockRandomMax.impressions / 2,
                clicks: mockRandomMax.clicks / 2,
                linkClicks: mockRandomMax.linkClicks / 2,
                purchases: mockRandomMax.conversions / 2,
                responses: mockRandomMax.conversions * 4,
                amountSpent: mockRandomMax.spend / 2,
            },
            TEST_PROMO_ID_2: {
                numAds: 72,
                impressions: mockRandomMax.impressions / 2,
                clicks: mockRandomMax.clicks / 2,
                linkClicks: mockRandomMax.linkClicks / 2,
                purchases: mockRandomMax.conversions / 2,
                responses: mockRandomMax.conversions * 4,
                amountSpent: mockRandomMax.spend / 2,
            },
        },
        budget: {
            facebook: mockRandomMax.spend / 3,
            instagram: mockRandomMax.spend / 3,
            audienceNetwork: mockRandomMax.spend / 3,
            graph: {
                y: getYValues([
                    ['facebook', mockRandomMax.spend / 3],
                    ['instagram', mockRandomMax.spend / 3],
                    ['audienceNetwork', mockRandomMax.spend / 3]
                ]),
                x: getXValues(timezone),
            },
        },
        ads: {
            facebook: 144,
            instagram: 144,
            audienceNetwork: 144,
        },
        impression: {
            facebook: mockRandomMax.impressions / 2,
            instagram: mockRandomMax.impressions / 4,
            audienceNetwork: mockRandomMax.impressions / 4,
            graph: {
                y: getYValues([
                    ['facebook', mockRandomMax.impressions / 2],
                    ['instagram', mockRandomMax.impressions / 4],
                    ['audienceNetwork', mockRandomMax.impressions / 4]
                ]),
                x: getXValues(timezone),
            },
        },
        reach: {
            facebook: mockRandomMax.reach / 2,
            instagram: mockRandomMax.reach / 4,
            audienceNetwork: mockRandomMax.reach / 4,
            graph: {
                y: getYValues([
                    ['facebook', mockRandomMax.reach / 2],
                    ['instagram', mockRandomMax.reach / 4],
                    ['audienceNetwork', mockRandomMax.reach / 4]
                ]),
                x: getXValues(timezone),
            },
        },
        linkClick: {
            facebook: mockRandomMax.linkClicks / 2,
            instagram: mockRandomMax.linkClicks / 4,
            audienceNetwork: mockRandomMax.linkClicks / 4,
            graph: {
                y: getYValues([
                    ['facebook', mockRandomMax.linkClicks / 2],
                    ['instagram', mockRandomMax.linkClicks / 4],
                    ['audienceNetwork', mockRandomMax.linkClicks / 4]
                ]),
                x: getXValues(timezone),
            },
        },
        purchase: {
            facebook: mockRandomMax.conversions / 2,
            instagram: mockRandomMax.conversions / 4,
            audienceNetwork: mockRandomMax.conversions / 4,
            graph: {
                y: getYValues([
                    ['facebook', mockRandomMax.conversions / 2],
                    ['instagram', mockRandomMax.conversions / 4],
                    ['audienceNetwork', mockRandomMax.conversions / 4]
                ]),
                x: getXValues(timezone),
            },
        },
        response: {
            addPaymentInfo: mockRandomMax.conversions / 2,
            addToCart: mockRandomMax.conversions * 2,
            addToWishlist: mockRandomMax.conversions,
            completeRegistration: mockRandomMax.conversions,
            initiateCheckout: mockRandomMax.conversions / 4,
            lead: mockRandomMax.conversions / 3,
            search: mockRandomMax.conversions * 3,
            viewContent: mockRandomMax.conversions * 4,
            graph: {
                y: getYValues([
                    ['addPaymentInfo', mockRandomMax.conversions / 2],
                    ['addToCart', mockRandomMax.conversions * 2],
                    ['addToWishlist', mockRandomMax.conversions],
                    ['completeRegistration', mockRandomMax.conversions],
                    ['initiateCheckout', mockRandomMax.conversions / 4],
                    ['lead', mockRandomMax.conversions / 3],
                    ['search', mockRandomMax.conversions * 3],
                    ['viewContent', mockRandomMax.conversions * 4]
                ]),
                x: getXValues(timezone),
            },
        },
    };
    return response;
};

exports.Mock = {
    genderAge: mockGenderAge,
    region: mockRegion,
    hour: mockHour,
    platform: mockPlatform,
    platformReport: mockPlatformReport,
};

const addUpMetrics = (container, metrics) => {
    container.impressions += metrics.impressions;
    container.clicks += metrics.clicks;
    container.linkClicks += metrics.linkClicks;
    container.purchases += metrics.purchases;
    container.responses += (metrics.responses || metrics.responses === 0)
        ? metrics.responses
        : (metrics.addPaymentInfo
            + metrics.addToCart
            + metrics.addToWishlist
            + metrics.completeRegistration
            + metrics.initiateCheckout
            + metrics.lead
            + metrics.search
            + metrics.viewContent);
    container.amountSpent += metrics.amountSpent || metrics.spend;
};

const graph = (report, x, y, type) => {
    if (type !== 'response') {
        report[type] = {
            facebook: y.facebook.reduce((a, b) => a + b, 0),
            instagram: y.instagram.reduce((a, b) => a + b, 0),
            audienceNetwork: y.audienceNetwork.reduce((a, b) => a + b, 0),
            graph: {
                x: x,
                y: Object.keys(y).map((key) => {
                    const line = {
                        label: key,
                        data: y[key],
                    };
                    return line;
                }),
            },
        };
    } else {
        report[type] = {
            addPaymentInfo: y.addPaymentInfo.reduce((a, b) => a + b, 0),
            addToCart: y.addToCart.reduce((a, b) => a + b, 0),
            addToWishlist: y.addToWishlist.reduce((a, b) => a + b, 0),
            completeRegistration: y.completeRegistration.reduce((a, b) => a + b, 0),
            initiateCheckout: y.initiateCheckout.reduce((a, b) => a + b, 0),
            lead: y.lead.reduce((a, b) => a + b, 0),
            search: y.search.reduce((a, b) => a + b, 0),
            viewContent: y.viewContent.reduce((a, b) => a + b, 0),
            graph: {
                x: x,
                y: Object.keys(y).map((key) => {
                    const line = {
                        label: key,
                        data: y[key],
                    };
                    return line;
                }),
            },
        };
    }
};

const platformFormatter = (platformRecords, promotionAds, platformAds, timezone) => {
    const report = {
        numPromotions: 0,
        numAds: platformAds.total,
        impressions: 0,
        clicks: 0,
        linkClicks: 0,
        purchases: 0,
        responses: 0,
        amountSpent: 0,
        promotions: {},
    };
    const dates = {};
    const platformCounter = {
        facebook: 0,
        instagram: 0,
        audience_network: 0,
    };
    const platformBreakdown = {
        facebook: [],
        instagram: [],
        audienceNetwork: [],
        total: [],
    };
    platformRecords.forEach((record) => {
        // Prepare dates
        const date = moment.tz(record.date, timezone).format('YYYY/MM/DD');
        const platform = record.platform;
        if (!dates[date]) {
            dates[date] = {
                budget: Object.assign({}, platformCounter),
                impression: Object.assign({}, platformCounter),
                reach: Object.assign({}, platformCounter),
                linkClick: Object.assign({}, platformCounter),
                purchase: Object.assign({}, platformCounter),
                response: {
                    addPaymentInfo: 0,
                    addToCart: 0,
                    addToWishlist: 0,
                    completeRegistration: 0,
                    initiateCheckout: 0,
                    lead: 0,
                    search: 0,
                    viewContent: 0,
                },
            };
        }
        dates[date].budget[platform] += record.spend;
        dates[date].impression[platform] += record.impressions;
        dates[date].reach[platform] += record.reach;
        dates[date].linkClick[platform] += record.linkClicks;
        dates[date].purchase[platform] += record.purchases;
        dates[date].response.addPaymentInfo += record.addPaymentInfo;
        dates[date].response.addToCart += record.addToCart;
        dates[date].response.addToWishlist += record.addToWishlist;
        dates[date].response.completeRegistration += record.completeRegistration;
        dates[date].response.initiateCheckout += record.initiateCheckout;
        dates[date].response.lead += record.lead;
        dates[date].response.search += record.search;
        dates[date].response.viewContent += record.viewContent;

        // Count individual promotion metrics
        const promotionId = record.promotionId;
        if (!report.promotions[promotionId]) {
            report.numPromotions += 1;
            report.promotions[promotionId] = {
                ads: 0,
                impressions: 0,
                clicks: 0,
                linkClicks: 0,
                purchases: 0,
                responses: 0,
                amountSpent: 0,
            };
        }
        addUpMetrics(report.promotions[promotionId], record);
    });

    const dateIds = Object.keys(dates).sort();
    const budget = JSON.parse(JSON.stringify(platformBreakdown));
    const impression = JSON.parse(JSON.stringify(platformBreakdown));
    const reach = JSON.parse(JSON.stringify(platformBreakdown));
    const linkClick = JSON.parse(JSON.stringify(platformBreakdown));
    const purchase = JSON.parse(JSON.stringify(platformBreakdown));
    const response = {
        addPaymentInfo: [],
        addToCart: [],
        addToWishlist: [],
        completeRegistration: [],
        initiateCheckout: [],
        lead: [],
        search: [],
        viewContent: [],
        total: [],
    };
    for (let i = 0; i < dateIds.length; i++) {
        const dateValues = dates[dateIds[i]];
        // Budget
        budget.facebook[i] = dateValues.budget.facebook;
        budget.instagram[i] = dateValues.budget.instagram;
        budget.audienceNetwork[i] = dateValues.budget.audience_network;
        budget.total[i] = budget.facebook[i] + budget.instagram[i] + budget.audienceNetwork[i];

        // Impression
        impression.facebook[i] = dateValues.impression.facebook;
        impression.instagram[i] = dateValues.impression.instagram;
        impression.audienceNetwork[i] = dateValues.impression.audience_network;
        impression.total[i] = impression.facebook[i] + impression.instagram[i] + impression.audienceNetwork[i];

        // Reach
        reach.facebook[i] = dateValues.reach.facebook;
        reach.instagram[i] = dateValues.reach.instagram;
        reach.audienceNetwork[i] = dateValues.reach.audience_network;
        reach.total[i] = reach.facebook[i] + reach.instagram[i] + reach.audienceNetwork[i];

        // LinkClick
        linkClick.facebook[i] = dateValues.linkClick.facebook;
        linkClick.instagram[i] = dateValues.linkClick.instagram;
        linkClick.audienceNetwork[i] = dateValues.linkClick.audience_network;
        linkClick.total[i] = linkClick.facebook[i] + linkClick.instagram[i] + linkClick.audienceNetwork[i];

        // Purchase
        purchase.facebook[i] = dateValues.purchase.facebook;
        purchase.instagram[i] = dateValues.purchase.instagram;
        purchase.audienceNetwork[i] = dateValues.purchase.audience_network;
        purchase.total[i] = purchase.facebook[i] + purchase.instagram[i] + purchase.audienceNetwork[i];

        // Response
        response.addPaymentInfo[i] = dateValues.response.addPaymentInfo;
        response.addToCart[i] = dateValues.response.addToCart;
        response.addToWishlist[i] = dateValues.response.addToWishlist;
        response.completeRegistration[i] = dateValues.response.completeRegistration;
        response.initiateCheckout[i] = dateValues.response.initiateCheckout;
        response.lead[i] = dateValues.response.lead;
        response.search[i] = dateValues.response.search;
        response.viewContent[i] = dateValues.response.viewContent;
        response.total[i] = response.addPaymentInfo[i]
            + response.addToCart[i]
            + response.addToWishlist[i]
            + response.completeRegistration[i]
            + response.initiateCheckout[i]
            + response.lead[i]
            + response.search[i]
            + response.viewContent[i];
    }
    const x = dateIds.map(dateId => dateId.substring(5));
    graph(report, x, budget, 'budget');
    delete platformAds.total;
    report.ads = platformAds;
    graph(report, x, impression, 'impression');
    graph(report, x, reach, 'reach');
    graph(report, x, linkClick, 'linkClick');
    graph(report, x, purchase, 'purchase');
    graph(report, x, response, 'response');
    Object.keys(report.promotions).forEach((promotionId) => {
        report.promotions[promotionId].ads = promotionAds[promotionId];
        addUpMetrics(report, report.promotions[promotionId]);
    });
    return report;
};

const demographicFormatter = (demographicRecords, locale) => {
    const report = {
        impressions: {},
        clicks: {},
        linkClicks: {},
        purchases: {},
    };
    const regionValues = {};
    const hourValues = {};
    demographicRecords.forEach((record) => {
        Object.keys(report).forEach((metric) => {
            Object.keys(record[metric]).forEach((demog) => {
                if (!report[metric][demog]) report[metric][demog] = {};
                if (demog === 'genderAge') {
                    Object.keys(record[metric][demog]).forEach((gender) => {
                        if (!report[metric][demog][gender]) report[metric][demog][gender] = {};
                        Object.keys(record[metric][demog][gender]).forEach((age) => {
                            if (!report[metric][demog][gender][age]) report[metric][demog][gender][age] = 0;
                            report[metric][demog][gender][age] += record[metric][demog][gender][age];
                        });
                    });
                } else if (demog === 'region') {
                    record[metric][demog].forEach((region) => {
                        if (!regionValues[metric]) regionValues[metric] = {};
                        if (!regionValues[metric][region.key]) regionValues[metric][region.key] = 0;
                        regionValues[metric][region.key] += region.value;
                    });
                } else if (demog === 'hour') {
                    Object.keys(record[metric][demog]).forEach((hour) => {
                        if (!hourValues[metric]) hourValues[metric] = {};
                        if (!hourValues[metric][hour]) hourValues[metric][hour] = 0;
                        hourValues[metric][hour] += record[metric][demog][hour];
                    });
                }
            });
        });
    });
    Object.keys(report).forEach((metric) => {
        Object.keys(report[metric].genderAge).forEach((gender) => {
            report[metric].genderAge[gender].total = Object.values(report[metric].genderAge[gender]).reduce((a, b) => a + b);
        });
        report[metric].region = Object.keys(regionValues[metric]).map((regionName) => {
            const regionData = constants.koreanRegionMap[regionName];
            return {
                id: regionData.key,
                title: (locale === 'kr') ? regionData.name_kr : regionName,
                value: regionValues[metric][regionName],
            };
        });
        const hourX = Object.keys(hourValues[metric]).map(hourRange => hourRange.substring(0, 2));
        const hourY = [{
            label: 'hour',
            data: Object.keys(hourValues[metric]).map(hourRange => hourValues[metric][hourRange]),
        }];
        report[metric].hour = { x: hourX, y: hourY };
    });

    return report;
};

const summaryFormatter = (insightsRecords, demographicRecords, locale) => {
    const report = {
        amountSpent: 0,
        budget: { facebook: 0, instagram: 0, audience_network: 0 },
        reach: 0,
        impressions: 0,
        linkClicks: 0,
        purchases: 0,
        responses: {
            addPaymentInfo: 0,
            addToCart: 0,
            addToWishlist: 0,
            completeRegistration: 0,
            initiateCheckout: 0,
            lead: 0,
            search: 0,
            viewContent: 0,
        },
        genderAge: {
            linkClicks: [],
            purchases: [],
        },
        region: {
            linkClicks: [],
            purchases: [],
        },
        hour: {
            linkClicks: [],
            purchases: [],
        },
    };
    insightsRecords.forEach((record) => {
        report.budget[record.platform] += record.spend;
        report.reach += record.reach;
        report.impressions += record.impressions;
        report.linkClicks += record.linkClicks;
        report.purchases += record.purchases;
        report.responses.addPaymentInfo += record.addPaymentInfo;
        report.responses.addToCart += record.addToCart;
        report.responses.addToWishlist += record.addToWishlist;
        report.responses.completeRegistration += record.completeRegistration;
        report.responses.initiateCheckout += record.initiateCheckout;
        report.responses.lead += record.lead;
        report.responses.search += record.search;
        report.responses.viewContent += record.viewContent;
    });
    report.amountSpent = Object.values(report.budget).reduce((a, b) => a + b);
    report.responses.total = Object.values(report.responses).reduce((a, b) => a + b);
    const demographicSummary = {};
    demographicRecords.forEach((record) => {
        ['linkClicks', 'purchases'].forEach((metric) => {
            if (!demographicSummary[metric]) demographicSummary[metric] = { genderAge: {}, region: {}, hour: {} };
            Object.keys(record[metric]).forEach((demog) => {
                if (demog === 'genderAge') {
                    Object.keys(record[metric][demog]).forEach((gender) => {
                        if (!demographicSummary[metric][demog][gender]) demographicSummary[metric][demog][gender] = {};
                        Object.keys(record[metric][demog][gender]).forEach((age) => {
                            if (!demographicSummary[metric][demog][gender][age]) demographicSummary[metric][demog][gender][age] = 0;
                            demographicSummary[metric][demog][gender][age] += record[metric][demog][gender][age];
                        });
                    });
                } else if (demog === 'region') {
                    record[metric][demog].forEach((region) => {
                        if (!demographicSummary[metric][demog]) demographicSummary[metric][demog] = {};
                        if (!demographicSummary[metric][demog][region.key]) demographicSummary[metric][demog][region.key] = 0;
                        demographicSummary[metric][demog][region.key] += region.value;
                    });
                } else if (demog === 'hour') {
                    Object.keys(record[metric][demog]).forEach((hour) => {
                        if (!demographicSummary[metric][demog]) demographicSummary[metric][demog] = {};
                        if (!demographicSummary[metric][demog][hour]) demographicSummary[metric][demog][hour] = 0;
                        demographicSummary[metric][demog][hour] += record[metric][demog][hour];
                    });
                }
            });
        });
    });
    ['linkClicks', 'purchases'].forEach((metric) => {
        Object.keys(demographicSummary[metric]).forEach((demog) => {
            if (demog === 'genderAge') {
                Object.keys(demographicSummary[metric][demog]).forEach((gender) => {
                    Object.keys(demographicSummary[metric][demog][gender]).forEach((age) => {
                        report[demog][metric].push({
                            gender: gender,
                            age: age,
                            value: demographicSummary[metric][demog][gender][age],
                            ratio: ((demographicSummary[metric][demog][gender][age] / (report[metric] || 1)) * 100).toFixed(2),
                        });
                    });
                });
            } else if (demog === 'region') {
                Object.keys(demographicSummary[metric][demog]).forEach((region) => {
                    report[demog][metric].push({
                        region: (locale === 'kr') ? constants.koreanRegionMap[region].name_kr : region,
                        value: demographicSummary[metric][demog][region],
                        ratio: ((demographicSummary[metric][demog][region] / (report[metric] || 1)) * 100).toFixed(2),
                    });
                });
            } else if (demog === 'hour') {
                Object.keys(demographicSummary[metric][demog]).forEach((hour) => {
                    report[demog][metric].push({
                        hour: hour.substring(0, 2),
                        value: demographicSummary[metric][demog][hour],
                        ratio: ((demographicSummary[metric][demog][hour] / (report[metric] || 1)) * 100).toFixed(2),
                    });
                });
            }
        });
    });
    return report;
};

const getValue = (insightObj, metric) => {
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
};

const genderAgeFormatter = (demoReport, genderAgeArray) => {
    Object.keys(demoReport).forEach((metric) => {
        demoReport[metric].genderAge = {};
        const totals = {};
        genders.forEach((gender) => {
            demoReport[metric].genderAge[gender] = {};
            totals[gender] = 0;
        });
        genderAgeArray.forEach((item) => {
            const value = getValue(item, metric);
            demoReport[metric].genderAge[item[Breakdown.gender]][item[Breakdown.age]] = value;
            totals[item[Breakdown.gender]] += value;
        });
        Object.keys(totals).forEach((gender) => {
            demoReport[metric].genderAge[gender].total = totals[gender];
        });
    });
    return demoReport;
};

const regionFormatter = (demoReport, regionArray, locale) => {
    Object.keys(demoReport).forEach((metric) => {
        demoReport[metric].region = [];
        regionArray.forEach((item) => {
            const value = getValue(item, metric);
            demoReport[metric].region.push({
                id: constants.koreanRegionMap[item[Breakdown.region]].key,
                title: (locale === 'kr') ? constants.koreanRegionMap[item[Breakdown.region]].name_kr : item[Breakdown.region],
                value: value,
            });
        });
    });
    return demoReport;
};

const hourFormatter = (demoReport, hourArray) => {
    const hourValues = {};
    Object.keys(demoReport).forEach((metric) => {
        hourValues[metric] = {};
        hourArray.forEach((item) => {
            const value = getValue(item, metric);
            hourValues[metric][item[Breakdown.hourly_stats_aggregated_by_advertiser_time_zone]] = value;
        });
    });
    Object.keys(demoReport).forEach((metric) => {
        const hourX = Object.keys(hourValues[metric]).map(hourRange => hourRange.substring(0, 2));
        const hourY = [{
            label: 'hour',
            data: Object.keys(hourValues[metric]).map(hourRange => hourValues[metric][hourRange]),
        }];
        demoReport[metric].hour = { x: hourX, y: hourY };
    });

    return demoReport;
};

exports.Formatter = {
    platform: platformFormatter,
    demographic: demographicFormatter,
    genderAge: genderAgeFormatter,
    region: regionFormatter,
    hour: hourFormatter,
    summary: summaryFormatter,
};

