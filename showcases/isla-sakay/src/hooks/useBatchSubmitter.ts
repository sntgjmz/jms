import { useCallback, useState } from 'react';

export interface BatchFailure<TItem> {
  index: number;
  item: TItem;
  message: string;
}

export interface BatchProgressState<TItem, TResult> {
  isOpen: boolean;
  isRunning: boolean;
  processedCount: number;
  totalCount: number;
  successCount: number;
  failureCount: number;
  progressPercent: number;
  results: TResult[];
  failures: BatchFailure<TItem>[];
}

export interface BatchRunResult<TItem, TResult> {
  results: TResult[];
  failures: BatchFailure<TItem>[];
  successCount: number;
  failureCount: number;
  totalCount: number;
}

interface UseBatchSubmitterOptions<TItem, TResult> {
  submitItem: (item: TItem, index: number) => Promise<TResult>;
}

const createInitialState = <TItem, TResult>(): BatchProgressState<TItem, TResult> => ({
  isOpen: false,
  isRunning: false,
  processedCount: 0,
  totalCount: 0,
  successCount: 0,
  failureCount: 0,
  progressPercent: 0,
  results: [],
  failures: [],
});

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as any).response;
    if (typeof response?.data?.message === 'string' && response.data.message.trim()) {
      return response.data.message.trim();
    }
  }
  return error instanceof Error ? error.message : 'Batch item failed.';
};

export const useBatchSubmitter = <TItem, TResult>({
  submitItem,
}: UseBatchSubmitterOptions<TItem, TResult>) => {
  const [progress, setProgress] = useState<BatchProgressState<TItem, TResult>>(createInitialState);

  const dismiss = useCallback(() => {
    setProgress((current) => (current.isRunning ? current : createInitialState<TItem, TResult>()));
  }, []);

  const runBatch = useCallback(
    async (items: TItem[]): Promise<BatchRunResult<TItem, TResult>> => {
      const totalCount = items.length;
      const results: TResult[] = [];
      const failures: BatchFailure<TItem>[] = [];

      setProgress({
        isOpen: true,
        isRunning: true,
        processedCount: 0,
        totalCount,
        successCount: 0,
        failureCount: 0,
        progressPercent: totalCount === 0 ? 100 : 0,
        results: [],
        failures: [],
      });

      for (const [index, item] of items.entries()) {
        try {
          const result = await submitItem(item, index);
          results.push(result);
        } catch (error) {
          failures.push({
            index,
            item,
            message: getErrorMessage(error),
          });
        }

        const processedCount = index + 1;
        setProgress({
          isOpen: true,
          isRunning: true,
          processedCount,
          totalCount,
          successCount: results.length,
          failureCount: failures.length,
          progressPercent: totalCount === 0 ? 100 : Math.round((processedCount / totalCount) * 100),
          results: [...results],
          failures: [...failures],
        });
      }

      const summary: BatchRunResult<TItem, TResult> = {
        results,
        failures,
        successCount: results.length,
        failureCount: failures.length,
        totalCount,
      };

      setProgress({
        isOpen: true,
        isRunning: false,
        processedCount: totalCount,
        totalCount,
        successCount: results.length,
        failureCount: failures.length,
        progressPercent: totalCount === 0 ? 100 : 100,
        results: [...results],
        failures: [...failures],
      });

      return summary;
    },
    [submitItem],
  );

  return {
    progress,
    runBatch,
    dismiss,
  };
};
