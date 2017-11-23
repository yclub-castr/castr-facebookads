// app/facebookcast/budget/budget.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const ProjectModel = require('../project/project.model').Model;
const BillingEvent = require('../adset/adset.model').BillingEvent;

const impressions = [BillingEvent.impressions];
const videoViews = [BillingEvent.mrc_video_views, BillingEvent.video_views];
const highFreq = [BillingEvent.clicks, BillingEvent.link_clicks, BillingEvent.page_likes, BillingEvent.post_engagement];
const lowFreq = [BillingEvent.app_installs, BillingEvent.offer_claims];

class BudgetService {
    billingEventBudget(minimumBudget, billingEvent) {
        if (impressions.includes(billingEvent)) return minimumBudget.min_daily_budget_imp;
        else if (videoViews.includes(billingEvent)) return minimumBudget.min_daily_budget_video_views;
        else if (highFreq.includes(billingEvent)) return minimumBudget.min_daily_budget_high_freq;
        else if (lowFreq.includes(billingEvent)) return minimumBudget.min_daily_budget_low_freq;
        return minimumBudget.min_daily_budget_imp * 1000000;
    }

    async getMinimumBudget(params) {
        const accountId = params.accountId;
        const currency = params.currency;
        const billingEvent = params.billingEvent;
        try {
            logger.debug(`Getting minimum budgets for ${billingEvent} in ${currency} ...`);
            const fbResponse = await fbRequest.get(accountId, 'minimum_budgets');
            const allMinBudgets = fbResponse.data;
            let minBudgets;
            for (let i = 0; i < allMinBudgets.length; i++) {
                if (allMinBudgets[i].currency === currency) {
                    minBudgets = allMinBudgets[i];
                    break;
                }
            }
            const minBudget = this.billingEventBudget(minBudgets, billingEvent);
            return {
                success: true,
                message: null,
                data: {
                    minimumBudget: minBudget,
                },
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new BudgetService();
