module.exports = async(cfb, statsService, fs) => {
    const processEvent = (event, stats) => {
        let game = event.competitions[0];

        if (!game.status.type.completed) {
            return;
        }

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

        let output = [
            homeTeam.score / 100.0,
            awayTeam.score / 100.0
        ];

        return {
            input: input,
            output: output
        };
    }

    let processYear = async(year) => {
        let stats = statsService.getStatsForYear(year);

        const scoreboard = await cfb.scoreboard.getScoreboard({
            year: year
        });
        if (!scoreboard || !scoreboard.events) {
            return;
        }

        const bowlScoreboard = await cfb.scoreboard.getScoreboard({
            year: year,
            seasontype: 3,
            week: 1
        });

        let events = [
            ...scoreboard.events.filter(e => e.season.year == year)
        ];

        for (let event of bowlScoreboard.events) {
            if (!events.find(e => e.id == event.id)) {
                events.push(event);
            }
        }

        statsService.processSOS(stats, events);

        return events.map(event => {
            return processEvent(event, stats);
        }).filter(e => e);
    }

    let generateTraningData = async() => {
        const dataset = [
            ...(await processYear(2015)),
            ...(await processYear(2016))
        ];
        await fs.appendFile('./dataset.json', JSON.stringify(dataset, null, '\t'));

        const testData = await processYear(2017);
        await fs.appendFile('./testData.json', JSON.stringify(testData, null, '\t'));
    }

    return {
        generateTraningData: generateTraningData
    }
}