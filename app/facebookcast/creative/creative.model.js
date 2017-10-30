// app/facebookcast/creative/creative.model.js

const fbCastDB = require('../../db').fbCastDB;
const mongoose = require('../../db').mongoose;

const Creative = require('facebook-ads-sdk').AdCreative;

const Field = Creative.Field;
const ObjectType = Creative.ObjectType;
const CallToActionType = Creative.CallToActionType;
const Status = Creative.Status;

exports.Field = Field;
exports.ObjectType = ObjectType;
exports.CallToActionType = CallToActionType;
exports.Status = Status;
exports.Model = fbCastDB.model(
    'Creative',
    new mongoose.Schema(
        {
            castrBizId: { type: String, required: false },
            promotionId: { type: String, required: false },
            accountId: { type: String, required: false },
            id: { type: String, required: false },
            name: { type: String, required: false },
            status: { type: String, enum: Object.values(Status), required: false },
            body: String,
            title: String,
            callToActionType: { type: String, enum: Object.values(CallToActionType), required: false },
            effectiveObjectStoryId: String,
            objectStorySpec: Object,
            objectType: String,
            previews: Object,
            creativeLabel: Object,
        },
        {
            timestamps: {
                updatedAt: 'timeUpdated',
                createdAt: 'timeCreated',
            },
        }
    )
);
