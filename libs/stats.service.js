module.exports = (fs, csvjson) => {
    const statsPath = 'C:\\Users\\bradjewski\\Desktop\\data\\stats';
    const mappings = require('../teamMappings');

    const readData = (year, type) => {
        let data = fs.readFileSync(`${statsPath}\\${year}\\Team\\${type}.csv`, {
            encoding: 'utf8'
        });
        return csvjson.toObject(data, {
            quote: '"'
        });
    }

    const getStatsForYear = (year) => {
        const rushingOffense = readData(year, 'Rushing Offense');
        const rushingDefense = readData(year, 'Rushing Defense');
        const scoringOffense = readData(year, 'Scoring Offense');
        const scoringDefense = readData(year, 'Scoring Defense');
        const totalOffense = readData(year, 'Total Offense');
        const totalDefense = readData(year, 'Total Defense');
        const passingOffense = readData(year, 'Passing Offense');
        const passingDefense = readData(year, 'Passing Yards Allowed');
        const thirdDownOffense = readData(year, '3rd Down Conversion Pct');
        const thirdDownDefense = readData(year, '3rd Down Conversion Pct Defense');
        const toOffense = readData(year, 'Turnovers Lost');
        const toDefense = readData(year, 'Turnovers Gained');
        const redzoneO = readData(year, 'Red Zone Offense');
        const redzoneD = readData(year, 'Red Zone Defense');
        const talent = require(`../talent/${year}`);

        let teamStats = [];

        for (let oRushing of rushingOffense) {
            let mapMatch = mappings.find(t => {
                return oRushing.Team == t.location || oRushing.Team == t.ncaaName || oRushing.Team == t.abbreviation || oRushing.Team == t.altName;
            });

            if (!mapMatch) {
                console.log(oRushing.Team);
                continue;
            }

            let findTeam = t => t.Team == mapMatch.location || t.Team == mapMatch.ncaaName || t.Team == mapMatch.abbreviation || t.Team == mapMatch.altName;

            let dRushing = rushingDefense.find(findTeam);
            let oScoring = scoringOffense.find(findTeam);
            let dScoring = scoringDefense.find(findTeam);
            let oTotal = totalOffense.find(findTeam);
            let dTotal = totalDefense.find(findTeam);
            let oPassing = passingOffense.find(findTeam);
            let dPassing = passingDefense.find(findTeam);
            let oThirdDown = thirdDownOffense.find(findTeam);
            let dThirdDown = thirdDownDefense.find(findTeam);
            let giveaways = toOffense.find(findTeam);
            let takeaways = toDefense.find(findTeam);
            let oRedZone = redzoneO.find(findTeam);
            let dRedZone = redzoneD.find(findTeam);
            let teamTalent = talent.find(t => {
                return t.name == mapMatch.location || t.name == mapMatch.ncaaName || t.name == mapMatch.abbreviation || t.name == mapMatch.altName;
            });

            if (!dRushing ||
                !oScoring ||
                !dScoring ||
                !oTotal ||
                !dTotal ||
                !oPassing ||
                !dPassing ||
                !oThirdDown ||
                !dThirdDown ||
                !giveaways ||
                !takeaways ||
                !redzoneO ||
                !redzoneD ||
                !teamTalent) {
                continue;
            }

            teamStats.push({
                id: mapMatch.id,
                location: mapMatch.location,
                talent: teamTalent.talent / 1000,
                oRushP: oRushing['Yds/Rush'] / 10,
                dRushP: dRushing['Yds/Rush'] / 10,
                oPPP: parseFloat(oScoring.Pts.replace(/,/g, '')) / parseFloat(oTotal.Plays.replace(/,/g, '')),
                dPPP: parseFloat(dScoring.Pts.replace(/,/g, '')) / parseFloat(dTotal.Plays.replace(/,/g, '')),
                oYPP: oTotal['Yds/Play'] / 10,
                dYPP: dTotal['Yds/Play'] / 10,
                oYdsAtt: oPassing['Yds/Att'] / 20,
                dYdsAtt: dPassing['Yds/Att'] / 20,
                oThirdD: oThirdDown.Pct * 1.0,
                dThirdDown: dThirdDown.Pct * 1.0,
                giveaways: (giveaways['Turn Lost'] / giveaways.G) / 5,
                takeaways: (takeaways['Turn Gain'] / takeaways.G) / 5,
                oRZ: oRedZone.Pct * 1.0,
                dRZ: dRedZone.Pct * 1.0
            });
        }

        return teamStats;
    }

    let processSOS = (stats, events) => {
        for (let stat of stats) {
            stat.record = {};
            stat.conferenceRecord = {};

            let teamEvents = events.filter((event) => {
                let game = event.competitions[0];
                let team = game.competitors.find(t => {
                    return t.id == stat.id;
                })

                return team && game.status.type.completed;
            });

            let talent = 0;

            for (let event of teamEvents) {
                let otherTeam = event.competitions[0].competitors.find(t => {
                    return t.id != stat.id;
                });

                let otherTeamStats = stats.find(t => {
                    return t.id == otherTeam.id;
                });

                if (!otherTeamStats) {
                    continue;
                }

                talent += otherTeamStats.talent;
            }

            let orderedEvents = teamEvents.sort((a, b) => {
                return new Date(a.date) < new Date(b.date) ? 1 : 0;
            });

            let last = orderedEvents[0].competitions[0];
            let teamRecords = last.competitors.find(t => {
                return t.id == stat.id;
            }).records;

            let totalRecord = teamRecords.find(r => {
                return r.type == "total";
            });

            stat.record.wins = totalRecord.summary.split("-")[0] * 1.0;
            stat.record.losses = totalRecord.summary.split("-")[1] * 1.0;
            stat.record.winsProb = totalRecord.summary.split("-")[0] * 1.0;
            stat.record.lossesProb = totalRecord.summary.split("-")[1] * 1.0;

            let conferenceRecord = teamRecords.find(r => {
                return r.type == "vsconf";
            });

            if (conferenceRecord && conferenceRecord.summary) {
                stat.conferenceRecord.wins = conferenceRecord.summary.split("-")[0] * 1.0;
                stat.conferenceRecord.losses = conferenceRecord.summary.split("-")[1] * 1.0;
                stat.conferenceRecord.winsProb = conferenceRecord.summary.split("-")[0] * 1.0;
                stat.conferenceRecord.lossesProb = conferenceRecord.summary.split("-")[1] * 1.0;
            }

            stat.SOS = talent / teamEvents.length;
        }
    }

    return {
        getStatsForYear: getStatsForYear,
        processSOS: processSOS
    }
}