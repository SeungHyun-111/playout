import { onValue, ref, set } from "firebase/database";
import { useEffect, useRef } from "react";
import { database } from "../lib/firebase.js";

const SAVE_DELAY_MS = 500;

export default function useRtdbValue(path, value, setValue) {
  const hasLoaded = useRef(false);
  const skipNextSave = useRef(false);
  const pendingSave = useRef(null);

  useEffect(() => () => {
    // Settings screens unmount when navigating to generated schedules.
    // Flush edits rather than cancelling the last 500 ms of input.
    pendingSave.current?.();
    pendingSave.current = null;
  }, []);

  useEffect(() => {
    const valueRef = ref(database, path);

    return onValue(valueRef, (snapshot) => {
      const nextValue = snapshot.val();
      hasLoaded.current = true;

      if (nextValue === null || nextValue === undefined) return;

      pendingSave.current = null;
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

    pendingSave.current = () => {
      set(ref(database, path), value).catch(error => console.error("설정 저장 실패", path, error));
    };
    const timer = window.setTimeout(() => {
      pendingSave.current?.();
      pendingSave.current = null;
    }, SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [path, value]);
}
