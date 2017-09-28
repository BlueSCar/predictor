module.exports = (cfb, statsService, fs) => {
    let processEvent = (event, stats, dataset) => {
        let game = event.competitions[0];

        if (!game.status.type.completed) {
            return;
        }

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

        let output = [
            homeTeam.score / 100.0,
            awayTeam.score / 100.0
        ];

        dataset.push({
            input: input,
            output: output
        });
    }

    let processYear = (year, dataset) => {
        let stats = statsService.getStatsForYear(year);
        let events = [];

        return cfb.scoreboard.getScoreboard({
            year: year
        }).then((data) => {
            if (!data || !data.events) {
                return;
            }

            events = events.concat(data.events);
        }).then(() => {
            return cfb.scoreboard.getScoreboard({
                year: year,
                seasontype: 3,
                week: 1
            })
        }).then((data) => {
            events = events.concat(data.events);
        }).then(() => {
            statsService.processSOS(stats, events);

            for (let event of events) {
                processEvent(event, stats, dataset);
            }

            return Promise.resolve(dataset);
        })
    }

    let generateTraningData = () => {
        processYear(2015, [])
            .then((dataset) => {
                return processYear(2016, dataset);
            })
            // .then((dataset) => {
            //     return processYear(2017, dataset);
            // })
            .then((dataset) => {
                fs.appendFile('./dataset.json', JSON.stringify(dataset, null, '\t'), (err) => {
                    err;
                });
                dataset;
            }).then(() => {
                return processYear(2017, [])
                    .then((dataset) => {
                        fs.appendFile('./testData.json', JSON.stringify(dataset, null, '\t'), (err) => {
                            err;
                        });
                        dataset;
                    });
            });
    }

    return {
        processYear: processYear,
        processEvent: processEvent,
        generateTraningData: generateTraningData
    }
}