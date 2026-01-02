// api/index.js
module.exports = (req, res) => {
    res.status(200).send('ZoomInfo Enrichment Service is running. Use /enrich-contact or /enrich-company endpoints.');
};
