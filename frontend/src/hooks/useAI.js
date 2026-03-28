import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchAIInsight } from "../Services/aiApi";

const isPayloadReady = (intent, payload) => {
  if (!intent || !payload) return false;

  if (intent === "nlq") {
    return Boolean(payload.question?.trim());
  }

  return true;
};

export const useAI = (intent, payload) => {
  const isReady = isPayloadReady(intent, payload);
  const payloadKey = useMemo(() => JSON.stringify(payload ?? null), [payload]);

  const query = useQuery({
    queryKey: ["ai", intent, payloadKey],
    queryFn: () => fetchAIInsight(intent, payload),
    enabled: false,
    placeholderData: (previous) => previous,
    retry: 0,
    staleTime: 0,
  });

  const { refetch } = query;

  useEffect(() => {
    if (!isReady) return;

    refetch();
  }, [intent, isReady, payload, payloadKey, refetch]);

  return {
    data: query.data || null,
    isLoading: query.isLoading || query.isFetching,
    error: query.error?.response?.data?.message || query.error?.message || "",
    refetch: query.refetch,
  };
};
