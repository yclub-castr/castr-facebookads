// app/facebookcast/project/project.model.js

const fbCastDB = require('../../db').fbCastDB;
const mongoose = require('../../db').mongoose;

const STATUS = ['PENDING', 'APPROVED', 'ACTIVE', 'DISINTEGRATED'];

module.exports = fbCastDB.model(
    'Project',
    new mongoose.Schema(
        {
            castrLocId: String,
            accountId: String,
            accountName: String,
            accountStatus: { type: String, enum: STATUS },
            pageId: String,
            pageName: String,
            pageStatus: { type: String, enum: STATUS },
            instagramId: String,
            instagramName: String,
            isPBIA: Boolean,
            paymentMethod: String,
            accountVerified: Boolean,
            pageVerified: Boolean,
            paymentMethodVerified: Boolean,
        },
        {
            timestamps: {
                updatedAt: 'timeUpdated',
                createdAt: 'timeCreated',
            },
        }
    )
);
