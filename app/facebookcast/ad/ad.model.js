// app/facebookcast/ad/ad.model.js

const fbCastDB = require('../../db').fbCastDB;
const mongoose = require('../../db').mongoose;

const Ad = require('facebook-ads-sdk').Ad;

const Field = Ad.Field;
const BidType = Ad.BidType;
const EffectiveStatus = Ad.EffectiveStatus;
const Status = Ad.Status;

exports.Field = Field;
exports.BidType = BidType;
exports.EffectiveStatus = EffectiveStatus;
exports.Status = Status;
exports.Model = fbCastDB.model(
    'Ad',
    new mongoose.Schema(
        {
            castrLocId: { type: String, required: false },
            promotionId: { type: String, required: false },
            accountId: { type: String, required: false },
            campaignId: { type: String, required: false },
            adsetId: { type: String, required: false },
            id: { type: String, required: false },
            name: { type: String, required: false },
            creativeId: String,
            bidType: { type: String, enum: Object.values(BidType), required: false },
            status: { type: String, enum: Object.values(Status), required: false },
            effectiveStatus: { type: String, enum: Object.values(EffectiveStatus), required: false },
        },
        {
            timestamps: {
                updatedAt: 'timeUpdated',
                createdAt: 'timeCreated',
            },
        }
    )
);
