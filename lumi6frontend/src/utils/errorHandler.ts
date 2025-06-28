export const handleApiError = (err: any, defaultMessage: string): string => {
  return err?.response?.data?.error || err?.message || defaultMessage;
};

export const logError = (context: string, error: any): void => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  }
}; 