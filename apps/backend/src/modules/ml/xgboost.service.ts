export interface DataPoint {
  features: number[]; // [prev_expense, income, category_count, avg_tx_size, month_num]
  label: number;      // actual expense
  period: string;     // YYYY-MM
}

export interface TreeSplit {
  featureIdx: number;
  threshold: number;
  leftVal: number;
  rightVal: number;
  mseReduction: number;
}

export interface XGBoostModelEvaluation {
  mae: number;
  rmse: number;
  r2: number;
  trainSampleSize: number;
  testSampleSize: number;
}

export interface ExpensePredictionResult {
  hasSufficientData: boolean;
  predictedNextMonthExpense: number;
  baselineEstimate?: number;
  message: string;
  evaluation?: XGBoostModelEvaluation;
  treesCount: number;
  featureImportance: Record<string, number>;
}

export class DecisionStump {
  public featureIdx: number = 0;
  public threshold: number = 0;
  public leftVal: number = 0;
  public rightVal: number = 0;

  constructor(featureIdx: number, threshold: number, leftVal: number, rightVal: number) {
    this.featureIdx = featureIdx;
    this.threshold = threshold;
    this.leftVal = leftVal;
    this.rightVal = rightVal;
  }

  public predict(features: number[]): number {
    return features[this.featureIdx] <= this.threshold ? this.leftVal : this.rightVal;
  }
}

export class XGBoostService {
  /**
   * Calculates Mean Squared Error
   * MSE = (1/n) * \sum (y_i - \hat{y}_i)^2
   */
  public static calculateMSE(actuals: number[], preds: number[]): number {
    if (actuals.length === 0) return 0;
    const sum = actuals.reduce((acc, y, i) => acc + Math.pow(y - preds[i], 2), 0);
    return sum / actuals.length;
  }

  /**
   * Evaluates best feature split minimizing MSE
   */
  private static findBestSplit(X: number[][], residuals: number[]): DecisionStump | null {
    const n = X.length;
    if (n < 2) return null;

    const numFeatures = X[0].length;
    let bestMse = Infinity;
    let bestStump: DecisionStump | null = null;

    for (let f = 0; f < numFeatures; f++) {
      const values = X.map(row => row[f]);
      const uniqueVals = Array.from(new Set(values)).sort((a, b) => a - b);

      for (let i = 0; i < uniqueVals.length - 1; i++) {
        const threshold = (uniqueVals[i] + uniqueVals[i + 1]) / 2;

        const leftRes: number[] = [];
        const rightRes: number[] = [];

        for (let r = 0; r < n; r++) {
          if (X[r][f] <= threshold) leftRes.push(residuals[r]);
          else rightRes.push(residuals[r]);
        }

        if (leftRes.length === 0 || rightRes.length === 0) continue;

        const leftAvg = leftRes.reduce((s, v) => s + v, 0) / leftRes.length;
        const rightAvg = rightRes.reduce((s, v) => s + v, 0) / rightRes.length;

        let totalSqErr = 0;
        for (const v of leftRes) totalSqErr += Math.pow(v - leftAvg, 2);
        for (const v of rightRes) totalSqErr += Math.pow(v - rightAvg, 2);

        const mse = totalSqErr / n;
        if (mse < bestMse) {
          bestMse = mse;
          bestStump = new DecisionStump(f, threshold, leftAvg, rightAvg);
        }
      }
    }

    return bestStump;
  }

  /**
   * Train Gradient Boosted Decision Trees (XGBoost Regressor)
   * \hat{y}_i = \sum_{k=1}^K f_k(x_i)
   */
  public static trainAndPredict(
    historicalData: DataPoint[],
    latestFeatures: number[],
    numTrees: number = 10,
    learningRate: number = 0.15
  ): ExpensePredictionResult {
    const featureNames = ['prev_expense', 'income', 'category_count', 'avg_tx_size', 'month_num'];

    // If historical periods < 3, report insufficient data
    if (historicalData.length < 3) {
      const allLabels = historicalData.map(d => d.label);
      const baseline = allLabels.length > 0
        ? allLabels.reduce((s, v) => s + v, 0) / allLabels.length
        : 15000;

      return {
        hasSufficientData: false,
        predictedNextMonthExpense: Math.round(baseline),
        baselineEstimate: Math.round(baseline),
        message: `Insufficient historical months (${historicalData.length} recorded, minimum 3 required for GBDT/XGBoost). Showing baseline moving average.`,
        treesCount: 0,
        featureImportance: {}
      };
    }

    // Chronological train/test split (80% train, 20% test)
    const sorted = [...historicalData].sort((a, b) => a.period.localeCompare(b.period));
    const splitIndex = Math.max(2, Math.floor(sorted.length * 0.8));
    const trainData = sorted.slice(0, splitIndex);
    const testData = sorted.slice(splitIndex);

    const X_train = trainData.map(d => d.features);
    const y_train = trainData.map(d => d.label);

    const basePrediction = y_train.reduce((s, v) => s + v, 0) / y_train.length;
    let currentTrainPreds = new Array(y_train.length).fill(basePrediction);

    const trees: DecisionStump[] = [];
    const featureUsageCount: Record<string, number> = {};
    featureNames.forEach(f => (featureUsageCount[f] = 0));

    // Iteratively boost trees
    for (let k = 0; k < numTrees; k++) {
      const residuals = y_train.map((y, i) => y - currentTrainPreds[i]);
      const stump = this.findBestSplit(X_train, residuals);
      if (!stump) break;

      trees.push(stump);
      featureUsageCount[featureNames[stump.featureIdx]] += 1;

      // Update predictions with shrinkage: \hat{y} += \eta * f_k(x)
      for (let i = 0; i < y_train.length; i++) {
        currentTrainPreds[i] += learningRate * stump.predict(X_train[i]);
      }
    }

    // Evaluate on test partition if available, else on train
    const evalSet = testData.length > 0 ? testData : trainData;
    const X_eval = evalSet.map(d => d.features);
    const y_eval = evalSet.map(d => d.label);

    const evalPreds = X_eval.map(x => {
      let pred = basePrediction;
      for (const tree of trees) {
        pred += learningRate * tree.predict(x);
      }
      return Math.max(0, pred);
    });

    // MAE, RMSE, R^2
    const n = y_eval.length;
    const mae = n > 0 ? evalPreds.reduce((acc, p, i) => acc + Math.abs(y_eval[i] - p), 0) / n : 0;
    const rmse = n > 0 ? Math.sqrt(evalPreds.reduce((acc, p, i) => acc + Math.pow(y_eval[i] - p, 2), 0) / n) : 0;

    const yMean = n > 0 ? y_eval.reduce((s, v) => s + v, 0) / n : 1;
    const ssTot = n > 0 ? y_eval.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0) : 1;
    const ssRes = n > 0 ? evalPreds.reduce((acc, p, i) => acc + Math.pow(y_eval[i] - p, 2), 0) : 1;
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    // Predict next month from latest features
    let nextMonthPred = basePrediction;
    for (const tree of trees) {
      nextMonthPred += learningRate * tree.predict(latestFeatures);
    }
    nextMonthPred = Math.max(0, nextMonthPred);

    return {
      hasSufficientData: true,
      predictedNextMonthExpense: Math.round(nextMonthPred),
      message: `XGBoost ensemble of ${trees.length} boosted decision trees evaluated on chronological holdout data.`,
      evaluation: {
        mae: Math.round(mae * 100) / 100,
        rmse: Math.round(rmse * 100) / 100,
        r2: Math.round(r2 * 1000) / 1000,
        trainSampleSize: trainData.length,
        testSampleSize: testData.length
      },
      treesCount: trees.length,
      featureImportance: featureUsageCount
    };
  }
}
