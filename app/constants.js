
const timezone = {
    kr: 'Asia/Seoul',
    79: 'Asia/Seoul',
    us_east: 'America/New_York',
    7: 'America/New_York',
    karachi: 'Asia/Karachi',
    105: 'Asia/Karachi',
    us_west: '',
    utc: 'UTC',
};

const locale = {
    kr: 'ko_KR',
    us: 'en_US',
};

const fullDayMilliseconds = 24 * 60 * 60 * 1000;

exports.timezone = (tz) => {
    if (!timezone[tz]) throw new Error('Invalid timezone');
    return timezone[tz];
};
exports.locale = (loc) => {
    if (!locale[loc]) throw new Error('Invalid locale: Use either \'us\' or \'kr\' (eg. ?locale=us)');
    return locale[loc];
};
exports.fullDayMilliseconds = fullDayMilliseconds;
