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
                console.log(`Iteration ${i + 1}`);
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
        let myNetwork = new Architect.Perceptron(22, 12, 2);
        let trainer = new Trainer(myNetwork);
        let trainingSet = require('../dataset');
        let testSet = require('../testData');

        miniBatchTrain(20, trainer, trainingSet, 300, {
            rate: .1,
            iterations: 1000,
            error: 0.005,
            shuffle: true,
            log: 1000
        });

        let testResult = trainer.test(testSet);

        fs.writeFileSync('./myNetwork.json', JSON.stringify(myNetwork.toJSON(), null, '\t'));
    }

    let retrieveNetwork = () => {
        let network = require('../myNetwork');
        let myNetwork = Architect.Perceptron.fromJSON(network);

        return myNetwork;
    }

    return {
        trainNetwork: trainNetwork,
        retrieveNetwork: retrieveNetwork
    }
}