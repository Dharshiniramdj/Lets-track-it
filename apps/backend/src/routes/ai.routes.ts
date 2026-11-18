import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GeminiService, GeminiRoleType } from '../modules/ai/gemini.service.js';
import { RagService } from '../modules/ai/rag.service.js';
import { XGBoostService, DataPoint } from '../modules/ml/xgboost.service.js';
import { KMeansService } from '../modules/ml/kmeans.service.js';
import { DataStore } from '../common/db/data-store.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { ApiError } from '../common/errors/api-error.js';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string().min(1)
});

const AiChatSchema = z.object({
  role: z.enum(['COACH', 'AUDITOR', 'PLANNER', 'GUARD']),
  messages: z.array(ChatMessageSchema).min(1),
  accountId: z.string().optional(),
  customContext: z.string().optional()
});

const RagQuerySchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
  k: z.number().int().min(1).max(10).optional()
});

const ParseTextSchema = z.object({
  text: z.string().min(1, 'Text is required')
});

const ScanReceiptSchema = z.object({
  imageBase64: z.string().min(10, 'Valid base64 image data is required'),
  mimeType: z.string().optional()
});

export async function aiRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', AuthGuard.authenticate);

  /**
   * RAG-Powered AI Chatbot Endpoint
   */
  fastify.post('/chat', async (request, reply) => {
    const user = (request as any).user;
    const parse = AiChatSchema.safeParse(request.body);
    if (!parse.success) {
      throw ApiError.unprocessableEntity('Invalid AI chat payload', [
        { field: 'chat', message: 'Valid role and messages array required' }
      ]);
    }

    // Automatically augment with RAG retrieved context for user query
    const lastMessage = parse.data.messages[parse.data.messages.length - 1];
    let augmentedContext = parse.data.customContext || '';

    if (lastMessage && lastMessage.role === 'user') {
      try {
        const topChunks = await RagService.retrieveTopK(user.id, lastMessage.content, 3);
        if (topChunks.length > 0) {
          const ragText = topChunks.map((c, i) => `[Retrieved Evidence ${i + 1} - ${c.contentType}]: ${c.text}`).join('\n');
          augmentedContext = `${augmentedContext ? augmentedContext + '\n\n' : ''}--- RAG RETRIEVED USER FINANCIAL CONTEXT ---\n${ragText}`;
        }
      } catch (e) {
        console.warn('RAG context injection fallback:', e);
      }
    }

    const accountId = parse.data.accountId || `acc-${user.id}`;
    const result = await GeminiService.chat(user.id, {
      ...parse.data,
      accountId,
      customContext: augmentedContext
    });
    reply.send(result);
  });

  /**
   * Dedicated RAG Query Endpoint
   * Answers: "Why did expenses increase?", "How much can I save next month?", etc.
   */
  fastify.post('/rag-query', async (request, reply) => {
    const user = (request as any).user;
    const parse = RagQuerySchema.safeParse(request.body);
    if (!parse.success) {
      throw ApiError.unprocessableEntity('Invalid RAG query payload', [
        { field: 'question', message: 'Question string is required' }
      ]);
    }

    const result = await RagService.executeRag(user.id, parse.data.question, parse.data.k || 4);
    reply.send(result);
  });

  /**
   * Machine Learning Algorithm A: XGBoost Expense Prediction
   * Equation: \hat{y}_i = \sum_{k=1}^K f_k(x_i), Loss: MSE
   */
  fastify.get('/predictions/expenses', async (request, reply) => {
    const user = (request as any).user;
    const userAccountIds = Array.from(DataStore.accounts.values())
      .filter(a => a.ownerId === user.id || a.members.some(m => m.userId === user.id))
      .map(a => a.id);

    const txs = Array.from(DataStore.transactions.values()).filter(t => userAccountIds.includes(t.accountId));

    // Aggregate monthly data points chronologically
    const monthsMap: Record<string, { income: number; expense: number; count: number; categories: Set<string> }> = {};
    for (const t of txs) {
      const month = t.date.slice(0, 7);
      if (!monthsMap[month]) {
        monthsMap[month] = { income: 0, expense: 0, count: 0, categories: new Set() };
      }
      if (t.type === 'INCOME') monthsMap[month].income += t.amount;
      if (t.type === 'EXPENSE') monthsMap[month].expense += t.amount;
      monthsMap[month].count += 1;
      monthsMap[month].categories.add(t.category);
    }

    const sortedMonths = Object.keys(monthsMap).sort();
    const dataPoints: DataPoint[] = [];

    for (let i = 1; i < sortedMonths.length; i++) {
      const prevM = sortedMonths[i - 1];
      const curM = sortedMonths[i];
      const prevData = monthsMap[prevM];
      const curData = monthsMap[curM];
      const monthNum = parseInt(curM.split('-')[1], 10);
      const avgTx = curData.count > 0 ? curData.expense / curData.count : 0;

      dataPoints.push({
        period: curM,
        features: [prevData.expense, curData.income, curData.categories.size, avgTx, monthNum],
        label: curData.expense
      });
    }

    const latestMonth = sortedMonths[sortedMonths.length - 1];
    const latestData = latestMonth
      ? monthsMap[latestMonth]
      : { expense: 15000, income: 45000, count: 5, categories: new Set(['Groceries']) };
    const nextMonthNum = ((new Date().getMonth() + 1) % 12) + 1;
    const latestFeatures = [
      latestData.expense,
      latestData.income,
      latestData.categories.size,
      latestData.count > 0 ? latestData.expense / latestData.count : 0,
      nextMonthNum
    ];

    const result = XGBoostService.trainAndPredict(dataPoints, latestFeatures);
    reply.send(result);
  });

  /**
   * Machine Learning Algorithm B: K-Means Spending Pattern Discovery
   * Objective: J = \sum_{j=1}^K \sum_{x_i \in C_j} ||x_i - \mu_j||^2
   */
  fastify.get('/clusters/spending-patterns', async (request, reply) => {
    const user = (request as any).user;
    const userAccountIds = Array.from(DataStore.accounts.values())
      .filter(a => a.ownerId === user.id || a.members.some(m => m.userId === user.id))
      .map(a => a.id);

    const txs = Array.from(DataStore.transactions.values()).filter(t => userAccountIds.includes(t.accountId));
    const result = KMeansService.clusterTransactions(txs, 3);
    reply.send(result);
  });

  fastify.post('/parse-text', async (request, reply) => {
    const parse = ParseTextSchema.safeParse(request.body);
    if (!parse.success) {
      throw ApiError.unprocessableEntity('Invalid parse payload', [
        { field: 'text', message: 'Text required for parsing' }
      ]);
    }

    const result = await GeminiService.parseNaturalLanguage(parse.data.text);
    reply.send(result);
  });

  fastify.post('/scan-receipt', async (request, reply) => {
    const parse = ScanReceiptSchema.safeParse(request.body);
    if (!parse.success) {
      throw ApiError.unprocessableEntity('Invalid scan receipt payload', [
        { field: 'imageBase64', message: 'Base64 image data is required' }
      ]);
    }

    const result = await GeminiService.parseReceiptImage(parse.data.imageBase64, parse.data.mimeType);
    reply.send(result);
  });
}
