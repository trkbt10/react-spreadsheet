/**
 * @file Hook for setting showcase page metadata.
 */

import { useEffect } from "react";
import { useShowcaseMetadataContext } from "../ShowcaseMetadataContext";

type ShowcaseMetadata = {
  title: string;
  description: string;
};

export const useShowcaseMetadata = (metadata: ShowcaseMetadata): void => {
  const { setMetadata } = useShowcaseMetadataContext();

  useEffect(() => {
    setMetadata(metadata);

    return () => {
      setMetadata({});
    };
  }, [metadata.title, metadata.description, setMetadata]);
};
