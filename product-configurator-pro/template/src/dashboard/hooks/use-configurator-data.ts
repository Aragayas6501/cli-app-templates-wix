import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createConfiguratorOptionSet,
  getConfiguratorData,
  publishConfiguratorOptionSet,
  resetConfiguratorDemoData,
  saveConfiguratorOptionSet,
  saveConfiguratorProductMapping
} from "../../backend/configurator-data.web";
import { SAMPLE_APP_DATA } from "../../core/sample-data";
import type { AppData, OptionSet, ProductMapping } from "../../types";

const queryKey = ["product-configurator-pro"];

export const useConfiguratorData = () => {
  const queryClient = useQueryClient();
  const query = useQuery<AppData>({
    queryKey,
    queryFn: async () => {
      try {
        return await getConfiguratorData();
      } catch (error) {
        console.error("Failed to fetch configurator data.", error);
        return SAMPLE_APP_DATA;
      }
    }
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey });

  return {
    query,
    createOptionSet: useMutation({
      mutationFn: (name: string) => createConfiguratorOptionSet(name),
      onSuccess: invalidate
    }),
    saveOptionSet: useMutation({
      mutationFn: (optionSet: OptionSet) => saveConfiguratorOptionSet(optionSet),
      onSuccess: invalidate
    }),
    publishOptionSet: useMutation({
      mutationFn: (optionSetId: string) => publishConfiguratorOptionSet(optionSetId),
      onSuccess: invalidate
    }),
    saveProductMapping: useMutation({
      mutationFn: (mapping: ProductMapping) => saveConfiguratorProductMapping(mapping),
      onSuccess: invalidate
    }),
    resetDemoData: useMutation({
      mutationFn: () => resetConfiguratorDemoData(),
      onSuccess: invalidate
    })
  };
};
