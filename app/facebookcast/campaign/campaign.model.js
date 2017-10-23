// app/facebookcast/campaign/campaign.model.js

const fbCastDB = require('../../db').fbCastDB;
const mongoose = require('../../db').mongoose;

const Campaign = require('facebook-ads-sdk').Campaign;

const Field = Campaign.Field;
const Objective = Campaign.Objective;
const EffectiveStatus = Campaign.EffectiveStatus;
const Status = Campaign.Status;

exports.Field = Field;
exports.Objective = Objective;
exports.EffectiveStatus = EffectiveStatus;
exports.Status = Status;
exports.Model = fbCastDB.model(
    'Campaign',
    new mongoose.Schema(
        {
            castrLocId: { type: String, required: true },
            promotionId: { type: String, required: true },
            accountId: { type: String, required: true },
            id: { type: String, required: true },
            name: { type: String, required: true },
            objective: { type: String, enum: Object.values(Objective), required: true },
            status: { type: String, enum: Object.values(Status), required: true },
            effectiveStatus: { type: String, enum: Object.values(EffectiveStatus), required: true },
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
