(async() => {
    const dotEnv = require('dotenv');
    dotEnv.config();

    const cfb = require('cfb-data');
    const csvjson = require('csvjson');
    const fs = require('fs');

    const networkService = require('./libs/network.service')(fs);
    const statsService = require('./libs/stats.service')(fs, csvjson);
    const predictorService = await require('./libs/predictor.service')(fs, statsService, networkService, cfb);

    predictorService.updatePredictions();
})();