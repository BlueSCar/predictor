module.exports = (fs) => {
    const synaptic = require('synaptic');
    const Architect = synaptic.Architect;

    const networkPath = process.env.NETWORK;
    const networkPathProb = process.env.NETWORK_PROB;

    const retrieveNetwork = () => {
        let network = require(networkPath);
        let myNetwork = Architect.Perceptron.fromJSON(network);

        return myNetwork;
    }

    const retrieveProbNetwork = () => {
        const network = require(networkPathProb);
        const myNetwork = Architect.Perceptron.fromJSON(network);

        return myNetwork;
    }

    return {
        retrieveNetwork: retrieveNetwork,
        retrieveProbNetwork: retrieveProbNetwork,
    }
}