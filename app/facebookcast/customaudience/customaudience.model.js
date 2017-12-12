// app/facebookcast/customaudience/customaudience.model.js

const fbCastDB = require('../../db').fbCastDB;
const mongoose = require('../../db').mongoose;

const CustomAudience = require('facebook-ads-sdk').CustomAudience;

const Field = CustomAudience.Field;

exports.Field = Field;
exports.Model = fbCastDB.model(
    'Custom-Audience',
    new mongoose.Schema(
        {
            castrBizId: { type: String, required: false },
            castrLocId: String,
            promotionId: { type: String, required: false },
            accountId: { type: String, required: false },
            id: { type: String, required: false },
            name: { type: String, required: false },
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
