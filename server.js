let cfb = require('cfb-data');
let csvjson = require('csvjson');
let fs = require('fs');

let networkService = require('./libs/network.service')(fs);
let statsService = require('./libs/stats.service')(fs, csvjson);
let dataService = require('./libs/data.service')(cfb, statsService, fs);
// let predictorService = require('./libs/predictor.service')(fs, statsService, networkService, cfb);

// predictorService.initialize()
//     .then(() => {
//         // cfb.teams.getTeamList()
//         //     .then((result) => {
//         //         let teams = result.sports[0].leagues[0].teams;

//         //         let result1 = predictorService.projectGame(teams[0].team, teams[87].team);
//         //         let result2 = predictorService.projectGame(teams[87].team, teams[0].team);
//         //         console.log(`${result1.homeTeam.location} ${result1.homeProjection} - ${result1.awayTeam.location} ${result1.awayProjection}`);
//         //         console.log(`${result2.homeTeam.location} ${result2.homeProjection} - ${result2.awayTeam.location} ${result2.awayProjection}`);
//         //     });

//         // let ranks = predictorService.rankTeams();

//         // for (let rank of ranks){
//         //     fs.appendFileSync('C:\\Users\\bradjewski\\Desktop\\data\\ranks\\Week 5.csv', `\r\n${rank.id},${rank.location},${rank.wins},${rank.averageMargin}`);
//         // }

//         // predictorService.simulatePlayoff();

//         // let network = networkService.retrieveNetwork();

//         // let result = predictorService.projectGame(network, {
//         //     id: 277
//         // }, {
//         //     id: 2628
//         // }, 0, 1);
//         // result;

//         // predictorService.updatePredictions();

//         // predictorService.getProbabilities();
//     });


networkService.trainNetwork();