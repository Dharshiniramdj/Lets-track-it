import { TransactionRecord } from '../../common/db/data-store.js';

export interface ClusterSummary {
  clusterIndex: number;
  name: string;
  centroid: {
    averageAmount: number;
    averageDayOfMonth: number;
    discretionaryRatio: number;
  };
  transactionCount: number;
  totalSpent: number;
  percentageOfOutflow: number;
  topCategories: string[];
  characteristicDescription: string;
}

export interface KMeansResult {
  hasSufficientData: boolean;
  message: string;
  k: number;
  totalWithinClusterDistanceJ: number; // objective J
  clusters: ClusterSummary[];
}

export class KMeansService {
  /**
   * Euclidean Distance:
   * d(x_i, \mu_j) = \sqrt{ \sum_{r=1}^m (x_{ir} - \mu_{jr})^2 }
   */
  public static euclideanDistance(x: number[], mu: number[]): number {
    let sum = 0;
    for (let r = 0; r < x.length; r++) {
      sum += Math.pow(x[r] - mu[r], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Assigns category discretionary score:
   * 1.0 = Highly discretionary (Electronics, Entertainment, Shopping, Dining)
   * 0.2 = Essential (Groceries, Health, Utilities, Education)
   */
  private static getCategoryDiscretionaryScore(category: string): number {
    const cat = category.toUpperCase();
    if (cat.includes('ELECTRONIC') || cat.includes('SHOPPING') || cat.includes('ENTERTAINMENT') || cat.includes('DINING')) {
      return 1.0;
    }
    if (cat.includes('TRAVEL') || cat.includes('GIFT') || cat.includes('HOBBY')) {
      return 0.7;
    }
    if (cat.includes('GROCER') || cat.includes('FOOD') || cat.includes('BILLS') || cat.includes('UTILITIES')) {
      return 0.3;
    }
    return 0.5;
  }

  /**
   * Perform K-Means Clustering on User Expenses
   */
  public static clusterTransactions(
    transactions: TransactionRecord[],
    k: number = 3,
    maxIterations: number = 25
  ): KMeansResult {
    const expenses = transactions.filter(t => t.type === 'EXPENSE');

    if (expenses.length < 5) {
      return {
        hasSufficientData: false,
        message: `Insufficient transaction history (${expenses.length} expense records found; minimum 5 required for clustering).`,
        k: 0,
        totalWithinClusterDistanceJ: 0,
        clusters: []
      };
    }

    // Adapt K if transactions < 8
    const actualK = Math.min(k, Math.floor(expenses.length / 2));

    // Extract raw features: [amount, dayOfMonth, discretionaryScore]
    const rawFeatures: number[][] = expenses.map(t => {
      const date = new Date(t.date);
      const day = isNaN(date.getDate()) ? 15 : date.getDate();
      return [
        t.amount,
        day,
        this.getCategoryDiscretionaryScore(t.category)
      ];
    });

    // MinMax Feature Scaling
    const numFeatures = rawFeatures[0].length;
    const minVals = new Array(numFeatures).fill(Infinity);
    const maxVals = new Array(numFeatures).fill(-Infinity);

    for (const row of rawFeatures) {
      for (let f = 0; f < numFeatures; f++) {
        if (row[f] < minVals[f]) minVals[f] = row[f];
        if (row[f] > maxVals[f]) maxVals[f] = row[f];
      }
    }

    const scaledFeatures: number[][] = rawFeatures.map(row => {
      return row.map((val, f) => {
        const range = maxVals[f] - minVals[f];
        return range > 0 ? (val - minVals[f]) / range : 0.5;
      });
    });

    // Initialize Centroids using K-Means++
    const centroids: number[][] = [];
    centroids.push([...scaledFeatures[0]]);

    while (centroids.length < actualK) {
      const distances = scaledFeatures.map(x => {
        const distsToCentroids = centroids.map(c => this.euclideanDistance(x, c));
        return Math.min(...distsToCentroids);
      });
      const maxIdx = distances.indexOf(Math.max(...distances));
      centroids.push([...scaledFeatures[maxIdx]]);
    }

    // Iterative Assignment and Update
    let assignments = new Array(expenses.length).fill(0);
    let converged = false;
    let iteration = 0;

    while (!converged && iteration < maxIterations) {
      iteration++;
      let changed = false;

      // 1. Assignment step
      for (let i = 0; i < scaledFeatures.length; i++) {
        let minDist = Infinity;
        let bestCluster = 0;

        for (let c = 0; c < actualK; c++) {
          const dist = this.euclideanDistance(scaledFeatures[i], centroids[c]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = c;
          }
        }

        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      // 2. Centroid update step
      for (let c = 0; c < actualK; c++) {
        const clusterPoints = scaledFeatures.filter((_, idx) => assignments[idx] === c);
        if (clusterPoints.length > 0) {
          for (let f = 0; f < numFeatures; f++) {
            const avg = clusterPoints.reduce((sum, p) => sum + p[f], 0) / clusterPoints.length;
            centroids[c][f] = avg;
          }
        }
      }

      if (!changed) converged = true;
    }

    // Calculate within-cluster squared distance objective:
    // J = \sum_{j=1}^K \sum_{x_i \in C_j} ||x_i - \mu_j||^2
    let objectiveJ = 0;
    for (let i = 0; i < scaledFeatures.length; i++) {
      const c = assignments[i];
      const dist = this.euclideanDistance(scaledFeatures[i], centroids[c]);
      objectiveJ += dist * dist;
    }

    // Unscale and synthesize semantic summaries for each cluster
    const totalOverallExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const clusterSummaries: ClusterSummary[] = [];

    for (let c = 0; c < actualK; c++) {
      const memberIndices = assignments
        .map((clusterIdx, itemIdx) => (clusterIdx === c ? itemIdx : -1))
        .filter(idx => idx !== -1);

      if (memberIndices.length === 0) continue;

      const clusterTxs = memberIndices.map(idx => expenses[idx]);
      const totalClusterSpent = clusterTxs.reduce((s, t) => s + t.amount, 0);
      const avgAmt = totalClusterSpent / clusterTxs.length;

      // Average day of month
      const avgDay = clusterTxs.reduce((s, t) => {
        const d = new Date(t.date).getDate();
        return s + (isNaN(d) ? 15 : d);
      }, 0) / clusterTxs.length;

      // Category counts
      const catCount: Record<string, number> = {};
      clusterTxs.forEach(t => {
        catCount[t.category] = (catCount[t.category] || 0) + 1;
      });
      const topCategories = Object.entries(catCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

      const discScore = clusterTxs.reduce((s, t) => s + this.getCategoryDiscretionaryScore(t.category), 0) / clusterTxs.length;

      // Semantic Cluster Naming based on centroid characteristics
      let name = 'Regular Expense Cluster';
      let description = 'General spending activity.';

      if (avgAmt > 5000 || discScore > 0.75) {
        name = 'High-Value Major Purchases';
        description = `Large discretionary transactions (avg ₹${Math.round(avgAmt).toLocaleString()}) such as electronics, major retail, and travel upgrades.`;
      } else if (avgAmt < 500 && clusterTxs.length >= 3) {
        name = 'Daily Micro-Expenses & Impulses';
        description = `Frequent small purchases (avg ₹${Math.round(avgAmt).toLocaleString()}) across quick-commerce, coffee, and food delivery.`;
      } else {
        name = 'Essential Recurring Living Costs';
        description = `Core baseline household expenses (avg ₹${Math.round(avgAmt).toLocaleString()}) like groceries, utilities, and domestic bills.`;
      }

      clusterSummaries.push({
        clusterIndex: c,
        name,
        centroid: {
          averageAmount: Math.round(avgAmt * 100) / 100,
          averageDayOfMonth: Math.round(avgDay),
          discretionaryRatio: Math.round(discScore * 100) / 100
        },
        transactionCount: clusterTxs.length,
        totalSpent: Math.round(totalClusterSpent),
        percentageOfOutflow: totalOverallExpense > 0 ? Math.round((totalClusterSpent / totalOverallExpense) * 100) : 0,
        topCategories,
        characteristicDescription: description
      });
    }

    // Sort clusters by total spent descending
    clusterSummaries.sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      hasSufficientData: true,
      message: `K-Means partitioned ${expenses.length} expenses into ${clusterSummaries.length} spending clusters (Objective J: ${Math.round(objectiveJ * 100) / 100}).`,
      k: clusterSummaries.length,
      totalWithinClusterDistanceJ: Math.round(objectiveJ * 100) / 100,
      clusters: clusterSummaries
    };
  }
}
