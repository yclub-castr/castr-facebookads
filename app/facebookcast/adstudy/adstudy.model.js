// app/facebookcast/adstudy/adstudy.model.js

const fbCastDB = require('../../db').fbCastDB;
const mongoose = require('../../db').mongoose;

exports.Model = fbCastDB.model(
    'AdStudy',
    new mongoose.Schema(
        {
            castrBizId: { type: String, required: false },
            castrLocId: String,
            promotionId: { type: String, required: false },
            week: Number,
            id: { type: String, required: false },
            name: { type: String, required: false },
            description: String,
            cells: Object,
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
