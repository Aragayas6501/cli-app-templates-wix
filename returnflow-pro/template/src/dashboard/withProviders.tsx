import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { i18n } from "@wix/essentials";
import { WixDesignSystemProvider } from "@wix/design-system";
import "@wix/design-system/styles.global.css";

const queryClient = new QueryClient();

export function withProviders<P extends {} = {}>(Component: React.FC<P>) {
  return function DashboardProviders(props: P) {
    return (
      <WixDesignSystemProvider
        locale={i18n.getLocale()}
        features={{ newColorsBranding: true }}
      >
        <QueryClientProvider client={queryClient}>
          <Component {...props} />
        </QueryClientProvider>
      </WixDesignSystemProvider>
    );
  };
}
