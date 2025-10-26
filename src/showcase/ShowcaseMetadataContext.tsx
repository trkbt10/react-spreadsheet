/**
 * @file Context for managing showcase page metadata (title, description).
 */

import { createContext, useContext, useState } from "react";
import type { ReactNode, ReactElement } from "react";

type ShowcaseMetadata = {
  title?: string;
  description?: string;
};

type ShowcaseMetadataContextValue = {
  metadata: ShowcaseMetadata;
  setMetadata: (metadata: ShowcaseMetadata) => void;
};

const ShowcaseMetadataContext = createContext<ShowcaseMetadataContextValue | null>(null);

type ShowcaseMetadataProviderProps = {
  children: ReactNode;
};

export const ShowcaseMetadataProvider = ({ children }: ShowcaseMetadataProviderProps): ReactElement => {
  const [metadata, setMetadata] = useState<ShowcaseMetadata>({});

  return (
    <ShowcaseMetadataContext.Provider value={{ metadata, setMetadata }}>
      {children}
    </ShowcaseMetadataContext.Provider>
  );
};

export const useShowcaseMetadataContext = (): ShowcaseMetadataContextValue => {
  const context = useContext(ShowcaseMetadataContext);
  if (!context) {
    throw new Error("useShowcaseMetadataContext must be used within ShowcaseMetadataProvider");
  }
  return context;
};
