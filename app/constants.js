
const timezone = {
    kr: 'Asia/Seoul',
    79: 'Asia/Seoul',
    us_east: 'America/New_York',
    7: 'America/New_York',
    us_west: '',
    utc: 'UTC',
};


const locale = {
    kr: 'ko_KR',
    us: 'en_US',
};

exports.timezone = (tz) => {
    if (!timezone[tz]) throw new Error('Invalid timezone');
    return timezone[tz];
};
exports.locale = (loc) => {
    if (!locale[loc]) throw new Error('Invalid locale: Use either \'us\' or \'kr\'');
    return locale[loc];
};