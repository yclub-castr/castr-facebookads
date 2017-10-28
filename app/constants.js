
const timezone = {
    kr: 'ASIA/SEOUL',
    us_east: '',
    us_west: '',
    utc: 'UTC',
};


const locale = {
    kr: 'ko_KR',
    us: 'en_US',
};

exports.timezone = (tz) => {
    if (!timezone[tz]) throw new Error('Invalid timezone: Suggested values are [\'utc\', \'us_east\', \'us_west\', \'kr\'');
    return timezone[tz];
};
exports.locale = (loc) => {
    if (!locale[loc]) throw new Error('Invalid locale: Use either \'us\' or \'kr\'');
    return locale[loc];
};