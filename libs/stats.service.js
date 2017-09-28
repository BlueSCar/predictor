module.exports = (fs, csvjson) => {
    const statsPath = 'C:\\Users\\bradjewski\\Desktop\\data\\stats';
    const mappings = require('../teamMappings');

    let readData = (year, type) => {
        let data = fs.readFileSync(`${statsPath}\\${year}\\Team\\${type}.csv`, {
            encoding: 'utf8'
        });
        return csvjson.toObject(data, {
            quote: '"'
        });
    }

    let getStatsForYear = (year) => {
        let rushingOffense = readData(year, 'Rushing Offense');
        let rushingDefense = readData(year, 'Rushing Defense');
        let scoringOffense = readData(year, 'Scoring Offense');
        let scoringDefense = readData(year, 'Scoring Defense');
        let totalOffense = readData(year, 'Total Offense');
        let totalDefense = readData(year, 'Total Defense');
        let passingOffense = readData(year, 'Passing Offense');
        let passingDefense = readData(year, 'Passing Yards Allowed');
        let talent = require(`../talent/${year}`);

        let teamStats = [];

        for (let oRushing of rushingOffense) {
            let mapMatch = mappings.find(t => {
                return oRushing.Team == t.location || oRushing.Team == t.ncaaName || oRushing.Team == t.abbreviation || oRushing.Team == t.altName;
            });

            if (!mapMatch) {
                console.log(oRushing.Team);
                continue;
            }

            let dRushing = rushingDefense.find(t => t.Team == oRushing.Team);
            let oScoring = scoringOffense.find(t => t.Team == oRushing.Team);
            let dScoring = scoringDefense.find(t => t.Team == oRushing.Team);
            let oTotal = totalOffense.find(t => t.Team == oRushing.Team);
            let dTotal = totalDefense.find(t => t.Team == oRushing.Team);
            let oPassing = passingOffense.find(t => t.Team == oRushing.Team);
            let dPassing = passingDefense.find(t => t.Team == oRushing.Team);
            let teamTalent = talent.find(t => {
                return t.name == mapMatch.location || t.name == mapMatch.ncaaName || t.name == mapMatch.abbreviation || t.name == mapMatch.altName;
            });

            if (!dRushing || !oScoring || !dScoring || !oTotal || !dTotal || !oPassing || !dPassing || !teamTalent) {
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
                dYdsAtt: dPassing['Yds/Att'] / 20
            });
        }

        return teamStats;
    }

    let processSOS = (stats, events) => {
        for (let stat of stats) {
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
    
            stat.SOS = talent / teamEvents.length;
        }
    }

    return {
        getStatsForYear: getStatsForYear,
        processSOS: processSOS
    }
}