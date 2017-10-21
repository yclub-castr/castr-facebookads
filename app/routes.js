// app/routes.js

'use strict';

const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.send('It\'s alive!!!');
});


module.exports = router;
