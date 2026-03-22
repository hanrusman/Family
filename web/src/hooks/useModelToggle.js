import { useState, useCallback } from 'react';

const ALL_MODELS = [
  'knmi_seamless',
  'ecmwf_ifs025',
  'icon_seamless',
  'gfs_seamless',
  'meteofrance_seamless',
];

export function useModelToggle() {
  const [enabledModels, setEnabledModels] = useState(new Set(ALL_MODELS));

  const toggle = useCallback((model) => {
    setEnabledModels((prev) => {
      const next = new Set(prev);
      if (next.has(model)) {
        if (next.size > 1) next.delete(model);
      } else {
        next.add(model);
      }
      return next;
    });
  }, []);

  const isEnabled = useCallback((model) => enabledModels.has(model), [enabledModels]);

  return { enabledModels, toggle, isEnabled, allModels: ALL_MODELS };
}
