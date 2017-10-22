// app/facebookcast/campaign/campaign.model.js

const fbCastDB = require('../../db').fbCastDB;
const mongoose = require('../../db').mongoose;

const FacebookAds = require('facebook-ads-sdk');

const OBJECTIVE = Object.values(FacebookAds.Campaign.Objective);
const EFFECTIVE_STATUS = Object.values(FacebookAds.Campaign.EffectiveStatus);
const STATUS = Object.values(FacebookAds.Campaign.Status);

module.exports = fbCastDB.model(
    'Campaign',
    new mongoose.Schema(
        {
            castr_loc_id: { type: String, required: true },
            promotion_id: { type: String, required: true },
            account_id: { type: String, required: true },
            id: { type: String, required: true },
            name: { type: String, required: true },
            objective: { type: String, enum: OBJECTIVE, required: true },
            status: { type: String, enum: STATUS, required: true },
            effective_status: { type: String, enum: EFFECTIVE_STATUS, required: true },
            buying_type: String,
            budget_rebalance_flag: Boolean,
            start_time: Date,
            stop_time: Date,
        },
        {
            collection: 'campaign',
            timestamps: {
                updatedAt: 'time_updated',
                createdAt: 'time_created',
            },
        }
    )
);
