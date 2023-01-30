module.exports.getStringFromDate = (date) => {
    const dt = date.withTimeZone('Europe/Berlin');
    const yy = dt.year.toString().slice(-2);
    const mm = dt.month.toString().padStart(2, '0');
    const dd = dt.day.toString().padStart(2, '0');

    return `${yy}${mm}${dd}`;
};
