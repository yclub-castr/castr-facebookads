// app/facebookcast/adset/adset.model.js

const fbCastDB = require('../../db').fbCastDB;
const mongoose = require('../../db').mongoose;

const AdSet = require('facebook-ads-sdk').AdSet;

const Field = AdSet.Field;
const BillingEvent = AdSet.BillingEvent;
const OptimizationGoal = AdSet.OptimizationGoal;
const EffectiveStatus = AdSet.EffectiveStatus;
const Status = AdSet.Status;

exports.Field = Field;
exports.BillingEvent = BillingEvent;
exports.OptimizationGoal = OptimizationGoal;
exports.EffectiveStatus = EffectiveStatus;
exports.Status = Status;
exports.Model = fbCastDB.model(
    'AdSet',
    new mongoose.Schema(
        {
            castrLocId: { type: String, required: false },
            promotionId: { type: String, required: false },
            accountId: { type: String, required: false },
            campaignId: { type: String, required: false },
            id: { type: String, required: false },
            name: { type: String, required: false },
            billingEvent: { type: String, enum: Object.values(BillingEvent), required: false },
            isAutoBid: Boolean,
            dailyBudget: String,
            status: { type: String, enum: Object.values(Status), required: false },
            effectiveStatus: { type: String, enum: Object.values(EffectiveStatus), required: false },
            optimizationGoal: { type: String, enum: Object.values(OptimizationGoal), required: false },
            targeting: Object,
            startTime: Date,
            endTime: Date,
        },
        {
            timestamps: {
                updatedAt: 'timeUpdated',
                createdAt: 'timeCreated',
            },
        }
    )
);
