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
            castrBizId: { type: String, required: false },
            castrLocId: String,
            promotionId: { type: String, required: false },
            accountId: { type: String, required: false },
            id: { type: String, required: false },
            name: { type: String, required: false },
            objective: { type: String, enum: Object.values(Objective), required: false },
            status: { type: String, enum: Object.values(Status), required: false },
            effectiveStatus: { type: String, enum: Object.values(EffectiveStatus), required: false },
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
