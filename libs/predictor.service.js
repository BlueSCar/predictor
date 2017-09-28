module.exports = (fs, statsService, myNetwork, cfb) => {
    let csvPath = 'C:\\Users\\bradjewski\\Desktop\\data\\predictions\\Week 4.csv';
    let stats = statsService.getStatsForYear(2017);

    let lastYearStats = statsService.getStatsForYear(2016);

    let initialize = () => {
        return cfb.scoreboard.getScoreboard({
            year: 2017
        }).then((data) => {
            statsService.processSOS(stats, data.events);
        }).then(() => {
            return cfb.scoreboard.getScoreboard({
                year: 2016
            }).then((data) => {
                statsService.processSOS(lastYearStats, data.events);
            });
        });
    }

    let currentWeight = 1;
    let oldWeight = 0;

    let projectGame = (homeTeam, awayTeam, neutralSite = 1, conferenceCompetition = 0) => {
        let homeStats = stats.find(t => {
            return t.id == homeTeam.id;
        });

        let awayStats = stats.find(t => {
            return t.id == awayTeam.id;
        });

        // let homeStatsOld = lastYearStats.find(t => {
        //     return t.id == homeTeam.id;
        // });

        // let awayStatsOld = lastYearStats.find(t => {
        //     return t.id == awayTeam.id;
        // });

        if (!homeStats || !awayStats) {
            return;
        }

        let input = [
            neutralSite,
            conferenceCompetition,
            homeStats.talent,
            homeStats.SOS,
            homeStats.dRushP,
            homeStats.dPPP,
            homeStats.dYPP,
            homeStats.dYdsAtt,
            homeStats.oRushP,
            homeStats.oPPP,
            homeStats.oYPP,
            homeStats.oYdsAtt,
            awayStats.talent,
            awayStats.SOS,
            awayStats.dRushP,
            awayStats.dPPP,
            awayStats.dYPP,
            awayStats.dYdsAtt,
            awayStats.oRushP,
            awayStats.oPPP,
            awayStats.oYPP,
            awayStats.oYdsAtt
        ];

        let result = myNetwork.activate(input);

        return {
            homeTeam: homeTeam,
            homeProjection: result[0],
            awayTeam: awayTeam,
            awayProjection: result[1]
        }
    }

    let rankTeams = () => {
        let ranks = [];

        for (let team of stats) {
            let wins = 0;
            let totalMargin = 0;

            let others = stats.filter((t) => {
                return t.id != team.id;
            });

            for (let other of others) {
                let result = projectGame({
                    id: team.id
                }, {
                    id: other.id
                }, 0, 1);

                if (!result) {
                    result;
                }

                if (result.homeProjection > result.awayProjection) {
                    wins++;
                }

                totalMargin += (result.homeProjection - result.awayProjection);
            }

            ranks.push({
                id: team.id,
                location: team.location,
                wins: wins,
                averageMargin: (totalMargin / others.length)
            });
        }

        return ranks;
    }

    let simulatePlayoff = () => {
        let sorted = stats.sort((a, b) => {
            return b.talent - a.talent;
        }).slice();

        sorted.pop();
        sorted.pop();
        sorted.pop();

        for (let stat of stats){
            stat.playoffHistory = "";
        }

        let results = [];

        simulateRound(sorted, results, 1);

        for (let stat of stats){
            fs.appendFile("C:\\Users\\bradjewski\\Desktop\\data\\ranks\\rankings.csv", `\r\n${stat.playoffHistory},${stat.location}`);
        }

        for (let result of results){
            fs.appendFile("C:\\Users\\bradjewski\\Desktop\\data\\ranks\\results.csv", `\r\n${result.round},${result.homeId},${result.homeLocation},${result.homeScore},${result.awayId},${result.awayLocation},${result.awayScore}`);
        }
    }

    let simulateRound = (teams, results, round) => {
        if (teams.length == 1){
            return;
        }

        let winners = [];
        let losers = [];

        let numGames = teams.length / 2;

        let topTier = teams.splice(0, numGames);

        for (var i = 0; i < numGames; i++) {
            let topTeam = topTier[i];
            let bottomTeam = teams[numGames - (i + 1)];

            topStat = stats.find(t => {return t.id == topTeam.id;});
            bottomStat = stats.find(t => {return t.id == bottomTeam.id;});

            let result = projectGame({
                id: topTeam.id
            }, {
                id: bottomTeam.id
            }, 0, 1);

            if (result.homeProjection > result.awayProjection){
                topStat.playoffHistory += "1";
                bottomStat.playoffHistory += "0";
                winners.push(topTeam);
                losers.push(bottomTeam);
            } else {
                topStat.playoffHistory += "0";
                bottomStat.playoffHistory += "1";
                winners.push(bottomTeam);
                losers.push(topTeam);
            }

            results.push({
                round: round,
                homeId: topTeam.id,
                homeLocation: topTeam.location,
                homeScore: result.homeProjection,
                awayId: bottomTeam.id,
                awayLocation: bottomTeam.location,
                awayScore: result.awayProjection
            });
        }

        let newRound = round + 1;

        simulateRound(winners, results, newRound);
        simulateRound(losers, results, newRound);
    }

    let getGamePrediction = (event) => {
        let game = event.competitions[0];

        let homeTeam = game.competitors.find(t => {
            return t.homeAway == 'home';
        });
        let awayTeam = game.competitors.find(t => {
            return t.homeAway == 'away';
        });

        let homeStats = stats.find(t => {
            return t.id == homeTeam.id;
        });

        let awayStats = stats.find(t => {
            return t.id == awayTeam.id;
        });

        let homeStatsOld = lastYearStats.find(t => {
            return t.id == homeTeam.id;
        });

        let awayStatsOld = lastYearStats.find(t => {
            return t.id == awayTeam.id;
        });

        if (!homeStats || !awayStats || !homeStatsOld || !awayStatsOld) {
            return;
        }

        let input = [
            game.neutralSite ? 1 : 0,
            game.conferenceCompetition ? 1 : 0,
            homeStats.talent,
            homeStats.SOS,
            homeStats.dRushP * currentWeight + homeStatsOld.dRushP * oldWeight,
            homeStats.dPPP * currentWeight + homeStatsOld.dPPP * oldWeight,
            homeStats.dYPP * currentWeight + homeStatsOld.dYPP * oldWeight,
            homeStats.dYdsAtt * currentWeight + homeStatsOld.dYdsAtt * oldWeight,
            homeStats.oRushP * currentWeight + homeStatsOld.oRushP * oldWeight,
            homeStats.oPPP * currentWeight + homeStatsOld.oPPP * oldWeight,
            homeStats.oYPP * currentWeight + homeStatsOld.oYPP * oldWeight,
            homeStats.oYdsAtt * currentWeight + homeStatsOld.oYdsAtt * oldWeight,
            awayStats.talent,
            awayStats.SOS,
            awayStats.dRushP * currentWeight + awayStatsOld.dRushP * oldWeight,
            awayStats.dPPP * currentWeight + awayStatsOld.dPPP * oldWeight,
            awayStats.dYPP * currentWeight + awayStatsOld.dYPP * oldWeight,
            awayStats.dYdsAtt * currentWeight + awayStatsOld.dYdsAtt * oldWeight,
            awayStats.oRushP * currentWeight + awayStatsOld.oRushP * oldWeight,
            awayStats.oPPP * currentWeight + awayStatsOld.oPPP * oldWeight,
            awayStats.oYPP * currentWeight + awayStatsOld.oYPP * oldWeight,
            awayStats.oYdsAtt * currentWeight + awayStatsOld.oYdsAtt * oldWeight,
        ];

        let result = myNetwork.activate(input);

        return {
            id: event.id,
            date: game.date,
            homeTeam: homeTeam,
            homeProjection: result[0],
            awayTeam: awayTeam,
            awayProjection: result[1]
        }
    }

    let writeGamePrediction = (event) => {
        let result = getGamePrediction(event);

        if (!result){
            return;
        }

        fs.appendFile(csvPath, `\r\n${result.id},${result.date},${result.homeTeam.team.location},${Math.round(result.homeProjection * 1000)/10},${result.homeTeam.score},${result.awayTeam.team.location},${Math.round(result.awayProjection * 1000)/10},${result.awayTeam.score}`);
    }

    let updatePredictions = () => {
        cfb.scoreboard.getScoreboard({
            year: 2017
        }).then((data) => {
            statsService.processSOS(stats, data.events);

            for (let event of data.events) {
                writeGamePrediction(event);
            }
        });
    }

    return {
        initialize: initialize,
        getGamePrediction: getGamePrediction,
        updatePredictions: updatePredictions,
        projectGame: projectGame,
        rankTeams: rankTeams,
        simulatePlayoff: simulatePlayoff
    }
}