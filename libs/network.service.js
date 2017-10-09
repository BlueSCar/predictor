module.exports = (fs) => {
    let synaptic = require('synaptic');
    let Neuron = synaptic.Neuron,
        Layer = synaptic.Layer,
        Network = synaptic.Network,
        Trainer = synaptic.Trainer,
        Architect = synaptic.Architect;

    let miniBatchTrain = (iterations, trainer, trainingSet, MiniBatchSize, options) => {
        var i = 0;
        while (i < iterations) {
            var workingTrainingSet = trainingSet.slice(0);
            shuffle(workingTrainingSet);

            while (workingTrainingSet.length > MiniBatchSize) {
                var these = workingTrainingSet.splice(0, MiniBatchSize);
                trainer.train(these, options);
            }
            i++;
        }
    }

    /* Shuffle is a generic shuffle algorithm, I just modified this one from SO */
    /**
     * Shuffles copy of an array.
     * From http://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array-in-javascript
     * @param {Array} a items The array containing the items.
     */
    let shuffle = (a) => {
        var j, x, i, b = a;
        for (i = b.length; i; i--) {
            j = Math.floor(Math.random() * i);
            x = b[i - 1];
            b[i - 1] = b[j];
            b[j] = x;
        }
        return b;
    }

    let trainNetwork = () => {
        let myNetwork = new Architect.Perceptron(22, 5, 2);
        let trainer = new Trainer(myNetwork);
        let trainingSet = require('../dataset');
        let testSet = require('../testData');

        // miniBatchTrain(20, trainer, trainingSet, 300, {

        let error = 1;

        for (var i = 1; i < 50000; i++) {
            trainer.train(trainingSet, {
                rate: .1,
                iterations: 10,
                error: 0.005,
                shuffle: true
            });

            let testResult = trainer.test(testSet);

            if (testResult.error < error) {
                error = testResult.error;
                console.log(`New record at iteration ${i*10}: ${error}`);

                fs.writeFileSync('./myNetworkOptimized.json', JSON.stringify(myNetwork.toJSON(), null, '\t'));
            }
        }

        fs.writeFileSync('./myNetwork.json', JSON.stringify(myNetwork.toJSON(), null, '\t'));
    }

    let retrieveNetwork = () => {
        let network = require('../myNetwork');
        let myNetwork = Architect.Perceptron.fromJSON(network);

        return myNetwork;
    }

    let testNetwork = () => {
        let network = retrieveNetwork();
        let testSet = require('../testData');
        let trainer = new Trainer(network);

        let result = trainer.test(testSet);

        console.log(result.error);
    }

    let trainProbNetwork = () => {
        let myNetwork = new Architect.Perceptron(22, 5, 1);
        let trainer = new Trainer(myNetwork);
        let trainingSet = require('../dataset').map((value) => {
            return {
                input: value.input,
                output: [value.output[0] > value.output[1] ? 1 : 0]
            }
        });
        let testSet = require('../testData').map((value) => {
            return {
                input: value.input,
                output: [value.output[0] > value.output[1] ? 1 : 0]
            }
        });

        // miniBatchTrain(20, trainer, trainingSet, 300, {

        let error = 1;

        for (var i = 1; i < 50000; i++) {
            trainer.train(trainingSet, {
                rate: .1,
                iterations: 10,
                error: 0.005,
                shuffle: true
            });

            let testResult = trainer.test(testSet);

            if (testResult.error < error) {
                error = testResult.error;
                console.log(`New record at iteration ${i*10}: ${error}`);

                fs.writeFileSync('./myProbNetworkOptimized.json', JSON.stringify(myNetwork.toJSON(), null, '\t'));
            }
        }

        fs.writeFileSync('./myProbNetwork.json', JSON.stringify(myNetwork.toJSON(), null, '\t'));
    }

    let retrieveProbNetwork = () => {
        let network = require('../myProbNetwork');
        let myNetwork = Architect.Perceptron.fromJSON(network);

        return myNetwork;
    }

    let testProbNetwork = () => {
        let network = retrieveProbNetwork();
        let testSet = require('../testData').map((value) => {
            return {
                input: value.input,
                output: value.output[0] > value.output[1] ? 1 : 0
            }
        });
        let trainer = new Trainer(network);

        let result = trainer.test(testSet);

        console.log(result.error);
    }

    return {
        trainNetwork: trainNetwork,
        retrieveNetwork: retrieveNetwork,
        testNetwork: testNetwork,
        trainProbNetwork: trainProbNetwork,
        retrieveProbNetwork: retrieveProbNetwork,
        testProbNetwork: testProbNetwork,
    }
}