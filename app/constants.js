const tzParser = require('fb-moment-tzparser');

const locale = {
    kr: 'ko_KR',
    us: 'en_US',
};

const fullDayMilliseconds = 24 * 60 * 60 * 1000;

exports.timezone = tz => tzParser.parse(tz);
exports.locale = (loc) => {
    if (!locale[loc]) throw new Error('Invalid locale: Use either \'us\' or \'kr\' (eg. ?locale=us)');
    return locale[loc];
};
exports.fullDayMilliseconds = fullDayMilliseconds;
