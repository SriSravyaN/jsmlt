// Internal dependencies
import { Classifier } from '../base';
import DecisionTree from './decision-tree';
import * as Arrays from '../../arrays';
import * as Random from '../../random';

/**
 * Random forest learner. Builds multiple decision trees with a random subsample of the samples,
 * and averages their predictions for the final prediction model.
 */
export default class RandomForest extends Classifier {
  /**
   * Constructor. Initialize class members and store user-defined options.
   *
   * @param {Object} [optionsUser] - User-defined options for random forest
   * @param {number} [optionsUser.numTrees = 10] - Number of decision trees to build
   * @param {string} [optionsUser.criterion = 'gini'] - Splitting criterion. Either 'gini', for the
   *   Gini coefficient, or 'entropy' for the Shannon entropy
   * @param {number|string} [optionsUser.numFeatures = 1.0] - Number of features to subsample at
   *   each node. Either a number (float), in which case the input fraction of features is used
   *   (e.g., 1.0 for all features), or a string. If string, 'sqrt' and 'log2' are supported,
   *   causing the algorithm to use sqrt(n) and log2(n) features, respectively (where n is the
   *   total number of features)
   * @param {number} [optionsUser.maxDepth = -1] - Maximum depth of each decision tree. The depth of
   *   a decision tree is the number of nodes in the longest path from the decision tree root to a
   *   leaf. It is an indicator of the complexity of the tree. Use -1 for no maximum depth
   * @param {boolean} [bootstrap = true] - Whether to select samples for each tree by bootstrapping.
   *   If false, all samples are used for each tree. If true, n samples are drawn with replacement
   *   from the full set of samples for each tree (where n is the total number of samples)
   * @param {number} [optionsUser.numTrees = 10] - Number of trees to construct
   */
  constructor(optionsUser = {}) {
    super();

    // Parse options
    const optionsDefault = {
      criterion: 'gini',
      numFeatures: 1.0,
      maxDepth: -1,
      numTrees: 10,
      bootstrap: true,
    };

    const options = {
      ...optionsDefault,
      ...optionsUser,
    };

    // Set options
    this.criterion = options.criterion;
    this.numFeatures = options.numFeatures;
    this.maxDepth = options.maxDepth;
    this.numTrees = options.numTrees;
    this.bootstrap = options.bootstrap;
  }

  /**
   * @see {@link Classifier#train}
   */
  train(X, y) {
    if (X.length !== y.length) {
      throw new Error('Number of data points should match number of labels.');
    }

    // Construct and train decision trees
    this.trees = [];

    // All sample indices
    const sampleIndices = [...Array(X.length)].map((x, i) => i);

    for (let i = 0; i < this.numTrees; i += 1) {
      // Construct decision tree
      const tree = new DecisionTree({
        criterion: this.criterion,
        numFeatures: this.numFeatures,
        maxDepth: this.maxDepth,
      });

      // Select the input samples. If bootstrapping is disabled, use all samples. If it is enabled,
      // use a bootstrapped sample of all samples
      let treeX;
      let treeY;

      if (this.bootstrap) {
        const treeSamples = Random.sample(sampleIndices, X.length, true);
        treeX = treeSamples.map(sampleIndex => X[sampleIndex]);
        treeY = treeSamples.map(sampleIndex => y[sampleIndex]);
      } else {
        treeX = X;
        treeY = y;
      }

      // Train the tree
      tree.train(treeX, treeY);

      // Add the trained tree to the list of trees
      this.trees.push(tree);
    }
  }

  /**
   * @see {@link Classifier#predict}
   */
  predict(X) {
    if (typeof this.trees === 'undefined') {
      throw new Error('Model has to be trained in order to make predictions.');
    }

    // Make prediction for each data point
    const predictions = X.map(x => this.predictSample(x));

    return predictions;
  }

  /**
   * Make a prediction for a single sample.
   *
   * @param {Array.<number>} sampleFeatures - Data point features
   * @return {mixed} Prediction. Label of class with highest prevalence among k nearest neighbours
   */
  predictSample(sampleFeatures) {
    // Gather predictions from all trees
    const predictions = this.trees.map(x => x.predictSample(sampleFeatures));

    // Count the number of votes for each class
    const predictionCounts = Arrays.valueCounts(predictions);

    // Predict the class with the most predictions
    return predictionCounts.reduce((r, x) => (x[1] > r[1] ? x : r), [-1, -1])[0];
  }
}
