module.exports = async(fs, statsService, networkService, cfb) => {
    const csvPath = process.env.CSV_PATH;
    const recordsPath = process.env.RECORDS_PATH;
    const rankingsPath = process.env.RANKINGS_PATH;
    const playoffPath = process.env.PLAYOFFS_PATH;

    const myNetwork = networkService.retrieveNetwork();
    const probNetwork = networkService.retrieveProbNetwork();

    const stats = statsService.getStatsForYear(2017);
    const scoreboard = await cfb.scoreboard.getScoreboard({
        year: 2017
    });

    const bowlScoreboard = await cfb.scoreboard.getScoreboard({
        year: 2017,            
        seasontype: 3,
        week: 1
    }); 

    const events = [
        ...scoreboard.events.filter(e => e.season.year == 2017)
    ];

    for (let event of bowlScoreboard.events){
        if (!events.find(e => e.id == event.id)){
            events.push(event);
        }
    }

    await statsService.processSOS(stats, events);

    const projectGame = (network, homeTeam, awayTeam, neutralSite = 1, conferenceCompetition = 0) => {
        let homeStats = stats.find(t => t.id == homeTeam.id);
        let awayStats = stats.find(t => t.id == awayTeam.id);

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
            homeStats.oThirdD,
            homeStats.dThirdDown,
            homeStats.giveaways,
            homeStats.takeaways,
            homeStats.oRZ,
            homeStats.dRZ,
            homeStats.oDriveYardsAvg,
            homeStats.dDriveYardsAvg,
            homeStats.oDrivePlaysAvg,
            homeStats.dDrivePlaysAvg,
            homeStats.oDriveTimeAvg,
            homeStats.dDriveTimeAvg,
            awayStats.talent,
            awayStats.SOS,
            awayStats.dRushP,
            awayStats.dPPP,
            awayStats.dYPP,
            awayStats.dYdsAtt,
            awayStats.oRushP,
            awayStats.oPPP,
            awayStats.oYPP,
            awayStats.oYdsAtt,
            awayStats.oThirdD,
            awayStats.dThirdDown,
            awayStats.giveaways,
            awayStats.takeaways,
            awayStats.oRZ,
            awayStats.dRZ,
            awayStats.oDriveYardsAvg,
            awayStats.dDriveYardsAvg,
            awayStats.oDrivePlaysAvg,
            awayStats.dDrivePlaysAvg,
            awayStats.oDriveTimeAvg,
            awayStats.dDriveTimeAvg
        ];

        let result = network.activate(input);

        return {
            homeTeam: homeTeam,
            projection: result,
            awayTeam: awayTeam
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
                let result = projectGame(myNetwork, {
                    id: team.id
                }, {
                    id: other.id
                }, 0, 1);

                if (!result) {
                    result;
                }

                if (result.projection[0] > result.projection[1]) {
                    wins++;
                }

                totalMargin += (result.projection[0] - result.projection[1]);
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

        for (let stat of stats) {
            stat.playoffHistory = '';
        }

        let results = [];

        simulateRound(sorted, results, 1);

        for (let stat of stats) {
            fs.appendFile(rankingsPath, `\r\n${stat.playoffHistory},${stat.location}`);
        }

        for (let result of results) {
            fs.appendFile(playoffPath, `\r\n${result.round},${result.homeId},${result.homeLocation},${result.homeScore},${result.awayId},${result.awayLocation},${result.awayScore}`);
        }
    }

    let simulateRound = (teams, results, round) => {
        if (teams.length == 1) {
            return;
        }

        let winners = [];
        let losers = [];

        let numGames = teams.length / 2;

        let topTier = teams.splice(0, numGames);

        for (var i = 0; i < numGames; i++) {
            let topTeam = topTier[i];
            let bottomTeam = teams[numGames - (i + 1)];

            let topStat = stats.find(t => t.id == topTeam.id);
            let bottomStat = stats.find(t => t.id == bottomTeam.id);

            let result = projectGame(myNetwork, {
                id: topTeam.id
            }, {
                id: bottomTeam.id
            }, 0, 1);

            if (result.projection[0] > result.projection[1]) {
                topStat.playoffHistory += '1';
                bottomStat.playoffHistory += '0';
                winners.push(topTeam);
                losers.push(bottomTeam);
            } else {
                topStat.playoffHistory += '0';
                bottomStat.playoffHistory += '1';
                winners.push(bottomTeam);
                losers.push(topTeam);
            }

            results.push({
                round: round,
                homeId: topTeam.id,
                homeLocation: topTeam.location,
                homeScore: result.projection[0],
                awayId: bottomTeam.id,
                awayLocation: bottomTeam.location,
                awayScore: result.projection[1]
            });
        }

        let newRound = round + 1;

        simulateRound(winners, results, newRound);
        simulateRound(losers, results, newRound);
    }

    let getGamePrediction = (network, event) => {
        let game = event.competitions[0];
        let homeTeam = game.competitors.find(t => t.homeAway == 'home');
        let awayTeam = game.competitors.find(t => t.homeAway == 'away');
        let homeStats = stats.find(t => t.id == homeTeam.id);
        let awayStats = stats.find(t => t.id == awayTeam.id);

        if (!homeStats || !awayStats) {
            return;
        }

        let input = [
            game.neutralSite ? 1 : 0,
            game.conferenceCompetition ? 1 : 0,
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
            homeStats.oThirdD,
            homeStats.dThirdDown,
            homeStats.giveaways,
            homeStats.takeaways,
            homeStats.oRZ,
            homeStats.dRZ,
            homeStats.oDriveYardsAvg,
            homeStats.dDriveYardsAvg,
            homeStats.oDrivePlaysAvg,
            homeStats.dDrivePlaysAvg,
            homeStats.oDriveTimeAvg,
            homeStats.dDriveTimeAvg,
            awayStats.talent,
            awayStats.SOS,
            awayStats.dRushP,
            awayStats.dPPP,
            awayStats.dYPP,
            awayStats.dYdsAtt,
            awayStats.oRushP,
            awayStats.oPPP,
            awayStats.oYPP,
            awayStats.oYdsAtt,
            awayStats.oThirdD,
            awayStats.dThirdDown,
            awayStats.giveaways,
            awayStats.takeaways,
            awayStats.oRZ,
            awayStats.dRZ,
            awayStats.oDriveYardsAvg,
            awayStats.dDriveYardsAvg,
            awayStats.oDrivePlaysAvg,
            awayStats.dDrivePlaysAvg,
            awayStats.oDriveTimeAvg,
            awayStats.dDriveTimeAvg
        ];

        let result = network.activate(input);

        return {
            id: event.id,
            date: game.date,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            projection: result
        }
    }

    let writeGamePrediction = (event) => {
        let result = getGamePrediction(myNetwork, event);
        let probResult = getGamePrediction(probNetwork, event);

        if (!result) {
            return;
        }

        if (!event.competitions[0].status.type.completed && event.competitions[0].status.type.id != 5 && event.competitions[0].status.type.id != 6) {
            let margin = result.projection[0] - result.projection[1];
            let game = event.competitions[0];

            let homeTeam = game.competitors.find(t => t.homeAway == 'home');
            let awayTeam = game.competitors.find(t => t.homeAway == 'away');
            let homeStats = stats.find(t => t.id == homeTeam.id);
            let awayStats = stats.find(t => t.id == awayTeam.id);

            if (margin > 0) {
                homeStats.record.wins++;
                awayStats.record.losses++;

                if (game.conferenceCompetition) {
                    homeStats.conferenceRecord.wins++;
                    awayStats.conferenceRecord.losses++
                }
            } else {
                homeStats.record.losses++;
                awayStats.record.wins++;

                if (game.conferenceCompetition) {
                    homeStats.conferenceRecord.losses++;
                    awayStats.conferenceRecord.wins++
                }
            }

            homeStats.record.winsProb += probResult.projection[0];
            homeStats.record.lossesProb += (1 - probResult.projection[0]);
            awayStats.record.winsProb += (1 - probResult.projection[0]);
            awayStats.record.lossesProb += probResult.projection[0];

            if (game.conferenceCompetition) {
                homeStats.conferenceRecord.winsProb += probResult.projection[0];
                homeStats.conferenceRecord.lossesProb += (1 - probResult.projection[0]);
                awayStats.conferenceRecord.winsProb += (1 - probResult.projection[0]);
                awayStats.conferenceRecord.lossesProb += probResult.projection[0];
            }
        }

        fs.appendFile(csvPath, `\r\n${result.id},${result.date},${result.homeTeam.team.location},${Math.round(result.projection[0] * 1000)/10},${result.homeTeam.score},${result.awayTeam.team.location},${Math.round(result.projection[1] * 1000)/10},${result.awayTeam.score},${probResult.projection[0]}`);
    }

    let updatePredictions = async() => {
        const scoreboard = await cfb.scoreboard.getScoreboard({
            year: 2017
        });

        const bowlScoreboard = await cfb.scoreboard.getScoreboard({
            year: 2017,            
            seasontype: 3,
            week: 1
        }); 

        const events = [
            ...scoreboard.events.filter(e => e.season.year == 2017)
        ];

        for (let event of bowlScoreboard.events){
            if (!events.find(e => e.id == event.id)){
                events.push(event);
            }
        }

        statsService.processSOS(stats, events);

        for (let event of events) {
            writeGamePrediction(event);
        }

        for (let stat of stats) {
            fs.appendFile(recordsPath, `\r\n${stat.id},${stat.location},${stat.record.wins},${stat.record.losses},${stat.conferenceRecord == null ? 0 : stat.conferenceRecord.wins},${stat.conferenceRecord == null ? 0 : stat.conferenceRecord.losses},${stat.record.winsProb},${stat.record.lossesProb},${stat.conferenceRecord == null ? 0 : stat.conferenceRecord.winsProb},${stat.conferenceRecord == null ? 0 : stat.conferenceRecord.lossesProb}`);
        }
    }

    return {
        getGamePrediction: getGamePrediction,
        updatePredictions: updatePredictions,
        projectGame: projectGame,
        rankTeams: rankTeams,
        simulatePlayoff: simulatePlayoff,
        stats: stats
    }
}