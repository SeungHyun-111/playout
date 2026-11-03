import { onValue, ref, set } from "firebase/database";
import { useEffect, useRef } from "react";
import { database } from "../lib/firebase.js";

const SAVE_DELAY_MS = 500;

export default function useRtdbValue(path, value, setValue) {
  const hasLoaded = useRef(false);
  const skipNextSave = useRef(false);

  useEffect(() => {
    const valueRef = ref(database, path);

    return onValue(valueRef, (snapshot) => {
      const nextValue = snapshot.val();
      hasLoaded.current = true;

      if (nextValue === null || nextValue === undefined) return;

      skipNextSave.current = true;
      setValue(nextValue);
    });
  }, [path, setValue]);

  useEffect(() => {
    if (!hasLoaded.current) return undefined;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      set(ref(database, path), value);
    }, SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [path, value]);
}
