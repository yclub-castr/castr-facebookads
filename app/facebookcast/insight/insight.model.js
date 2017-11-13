// app/facebookcast/insight/insight.model.js

const fbCastDB = require('../../db').fbCastDB;
const mongoose = require('../../db').mongoose;
const constants = require('../../constants');
const Insight = require('facebook-ads-sdk').AdsInsights;

const Field = Insight.Field;
const Breakdown = Insight.Breakdowns;
const DatePreset = Insight.DatePreset;

const ages = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const genders = ['male', 'female'];
const platforms = ['facebook', 'audience_network', 'instagram'];
const regions = Object.keys(constants.koreanRegionMap);

exports.Field = Field;
exports.Breakdown = Breakdown;
exports.DatePreset = DatePreset;
exports.Model = fbCastDB.model(
    'Insight',
    new mongoose.Schema(
        {
            castrBizId: { type: String, required: false },
            castrLocId: String,
            promotionId: { type: String, required: false },
            accountId: { type: String, required: false },
            campaignId: { type: String, required: false },
            adsetId: { type: String, required: false },
            adId: { type: String, required: false },
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
    reach: 7500,
    impressions: 10000,
    clicks: 1000,
    link_clicks: 200,
    conversions: 50,
    spend: 500000,
};

class RandomRatio {
    constructor(numRands) {
        this.randomTokens = [];
        this.sum = 0;
        this.counter = 0;
        for (let i = 0; i < numRands; i++) {
            const randTok = Math.random();
            this.sum += randTok;
            this.randomTokens.push(randTok);
        }
    }
    next() {
        const nextPart = this.randomTokens[this.counter] / this.sum;
        this.counter += 1;
        return nextPart;
    }
}

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
                        value: Math.round(mockRandomMax.link_clicks * clickRatio),
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
                    value: Math.round(mockRandomMax.link_clicks * clickRatio),
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
                    value: Math.round(mockRandomMax.link_clicks * clickRatio),
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

const mockPlatform = () => {
    const randoms = [];
    for (let i = 0; i < 12; i++) randoms[i] = new RandomRatio(platforms.length);
    const response = {};
    for (let i = 0; i < platforms.length; i++) {
        const impRatio = randoms[1].next();
        const clickRatio = randoms[2].next();
        response[platforms[i]] = {
            spend: Math.round(mockRandomMax.spend * randoms[0].next()),
            reach: Math.round(mockRandomMax.reach * impRatio),
            impressions: Math.round(mockRandomMax.impressions * impRatio),
            clicks: Math.round(mockRandomMax.clicks * clickRatio),
            actions: [
                {
                    action_type: 'link_click',
                    value: Math.round(mockRandomMax.link_clicks * clickRatio),
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
        };
    }
    return { data: response };
};

exports.Mock = {
    genderAge: mockGenderAge,
    region: mockRegion,
    hour: mockHour,
    platform: mockPlatform,
};

const getValue = (insightObj, metric) => {
    let value;
    if (metric === 'impressions') {
        value = insightObj.impressions;
    } else if (metric === 'clicks') {
        value = insightObj.clicks;
    } else if (metric === 'linkClicks') {
        for (let i = 0; i < insightObj.actions.length; i++) {
            if (insightObj.actions[i].action_type === 'link_click') value = insightObj.actions[i].value;
        }
    } else if (metric === 'purchases') {
        for (let i = 0; i < insightObj.actions.length; i++) {
            if (insightObj.actions[i].action_type === 'offsite_conversion.fb_pixel_purchase') value = insightObj.actions[i].value;
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

