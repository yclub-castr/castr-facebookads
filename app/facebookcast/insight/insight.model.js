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
const genders = ['male', 'female'];
const platforms = ['facebook', 'audience_network', 'instagram'];
const regions = Object.keys(constants.koreanRegionMap);

const moment = utils.moment();
const RandomRatio = utils.RandomRatio;

exports.Field = Field;
exports.Breakdown = Breakdown;
exports.DatePreset = DatePreset;
exports.Model = fbCastDB.model(
    'Insight',
    new mongoose.Schema(
        {
            date: { type: Date, required: true },
            castrBizId: { type: String, required: true },
            castrLocId: { type: String, required: true },
            promotionId: { type: String, required: false },
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
        },
        {
            timestamps: {
                updatedAt: 'timeUpdated',
                createdAt: 'timeCreated',
            },
        }
    )
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

const mockPlatform = (timezone) => {
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
        linkClicks: mockRandomMax.linkClicks,
        purchases: mockRandomMax.conversions,
        responses: mockRandomMax.conversions * 8,
        amountSpent: mockRandomMax.spend,
        promotions: {
            TEST_PROMO_ID_1: {
                numAds: 72,
                impressions: mockRandomMax.impressions / 2,
                linkClicks: mockRandomMax.linkClicks / 2,
                purchases: mockRandomMax.conversions / 2,
                responses: mockRandomMax.conversions * 4,
                amountSpent: mockRandomMax.spend / 2,
            },
            TEST_PROMO_ID_2: {
                numAds: 72,
                impressions: mockRandomMax.impressions / 2,
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

const getValue = (insightObj, metric) => {
    let value = 0;
    if (metric === 'impressions') {
        value = insightObj.impressions;
    } else if (metric === 'clicks') {
        value = insightObj.clicks;
    } else if (metric === 'linkClicks') {
        if (insightObj.actions) {
            for (let i = 0; i < insightObj.actions.length; i++) {
                if (insightObj.actions[i].action_type === 'link_click') value = insightObj.actions[i].value;
            }
        }
    } else if (metric === 'purchases') {
        if (insightObj.actions) {
            for (let i = 0; i < insightObj.actions.length; i++) {
                if (insightObj.actions[i].action_type === 'offsite_conversion.fb_pixel_purchase') value = insightObj.actions[i].value;
            }
        }
    }
    return value;
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
    Object.keys(demoReport).forEach((metric) => {
        demoReport[metric].hour = {};
        hourArray.forEach((item) => {
            const value = getValue(item, metric);
            demoReport[metric].hour[item[Breakdown.hourly_stats_aggregated_by_advertiser_time_zone]] = value;
        });
    });
    return demoReport;
};

exports.Formatter = {
    genderAge: genderAgeFormatter,
    region: regionFormatter,
    hour: hourFormatter,
};

