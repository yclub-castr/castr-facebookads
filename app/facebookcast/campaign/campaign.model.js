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
            castrLocId: { type: String, required: true },
            promotionId: { type: String, required: true },
            accountId: { type: String, required: true },
            id: { type: String, required: true },
            name: { type: String, required: true },
            objective: { type: String, enum: OBJECTIVE, required: true },
            status: { type: String, enum: STATUS, required: true },
            effectiveStatus: { type: String, enum: EFFECTIVE_STATUS, required: true },
            buyingType: String,
            budgetRebalanceFlag: Boolean,
            startTime: Date,
            stopTime: Date,
        },
        {
            timestamps: {
                updatedAt: 'timeUpdated',
                createdAt: 'timeCreated',
            },
        }
    )
);
