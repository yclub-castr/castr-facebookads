// app/facebookcast/campaign/campaign.service.js

'use strict';

const logger = require('../../utils').logger();
const AdAccount = require('facebook-ads-sdk').AdAccount;
const Campaign = require('facebook-ads-sdk').Campaign;
const AdLabel = require('facebook-ads-sdk').AdLabel;
const CampaignModel = require('./campaign.model');

class CampaignService {
    async getCampaigns(req, res) {
        const accountId = req.query.accountId || process.env.SANDBOX_ACCOUNT_ID;
        try {
            logger.debug('Fetching campaigns...');
            const adAccount = new AdAccount({ id: accountId });
            const campaigns = await adAccount.getCampaigns();
            logger.debug('Campaign fetched');
            res.send(campaigns);
        } catch (err) {
            logger.error(err.message);
        }
    }
    async createCampaign(req, res) {
        const castrLocId = req.body.castrLocId;
        const promotionId = req.body.promotionId;
        const accountId = req.body.accountId;
        const name = req.body.name;
        const objective = req.body.objective;
        try {
            logger.debug('Creating adlabel for campaign...');
            const adLable = await new AdLabel({ name: promotionId }, accountId).create();
            logger.debug('Adlabel for campaign created');
            const data = {
                [Campaign.Field.adlabels]: [adLable],
                [Campaign.Field.name]: name,
                [Campaign.Field.objective]: objective,
                [Campaign.Field.budget_rebalance_flag]: true,
                [Campaign.Field.status]: Campaign.Status.paused,
            };
            logger.debug('Creating campaign...');
            let campaign = await new Campaign(data, accountId).create();
            logger.debug(`Campaign (#${campaign.id}) created`);
            campaign = await campaign.read([Campaign.Field.account_id, Campaign.Field.effective_status, Campaign.Field.buying_type]);
            const model = new CampaignModel({
                castr_loc_id: castrLocId,
                promotion_id: promotionId,
                account_id: campaign.account_id,
                id: campaign.id,
                name: campaign.name,
                objective: campaign.objective,
                status: campaign.status,
                effective_status: campaign.effective_status,
                buying_type: campaign.buying_type,
                budget_rebalance_flag: campaign.budget_rebalance_flag,
                start_time: campaign.start_time,
                stop_time: campaign.stop_time,
            });
            const write_result = model.save((err) => {
                if (err) {
                    logger.error(err);
                } else {
                    logger.debug(`Campaign (#${campaign.id}) stored to DB`);
                }
            });
            res.send({
                success: true,
                data: { campaignId: campaign.id },
            });
        } catch (err) {
            logger.error(err.message);
        }
    }
}

module.exports = new CampaignService();
