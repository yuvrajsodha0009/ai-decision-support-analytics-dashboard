import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchAskAgentInsight } from "../Services/aiApi";

const isPayloadReady = (payload) => {
  if (!payload) return false;
  return Boolean(payload.question?.trim());
};

export const useAskAgent = (payload) => {
  const isReady = isPayloadReady(payload);
  const payloadKey = useMemo(() => JSON.stringify(payload ?? null), [payload]);

  const query = useQuery({
    queryKey: ["ask-agent", payloadKey],
    queryFn: () => fetchAskAgentInsight(payload),
    enabled: false,
    retry: 0,
    staleTime: 0,
  });

  const { refetch } = query;

  useEffect(() => {
    if (!isReady) return;
    refetch();
  }, [isReady, payload, payloadKey, refetch]);

  return {
    data: query.data || null,
    isLoading: query.isLoading || query.isFetching,
    error: query.error?.response?.data?.message || query.error?.message || "",
  };
};
