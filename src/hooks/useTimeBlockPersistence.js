import { onValue, ref, set } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { database } from "../lib/firebase.js";

const TIME_BLOCK_PATH = "timeBlock/current";
const SAVE_DELAY_MS = 500;

export default function useTimeBlockPersistence({ headers, rows, setHeaders, setRows }) {
  const [status, setStatus] = useState("동기화 중");
  const hasLoaded = useRef(false);
  const skipNextSave = useRef(false);

  useEffect(() => {
    const timeBlockRef = ref(database, TIME_BLOCK_PATH);

    return onValue(
      timeBlockRef,
      (snapshot) => {
        const value = snapshot.val();
        hasLoaded.current = true;

        if (value?.headers && value?.rows) {
          skipNextSave.current = true;
          setHeaders(value.headers);
          setRows(value.rows);
          setStatus("동기화됨");
          return;
        }

        setStatus("동기화됨");
      },
      () => {
        hasLoaded.current = true;
        setStatus("동기화 실패");
      },
    );
  }, [setHeaders, setRows]);

  useEffect(() => {
    if (!hasLoaded.current) return undefined;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return undefined;
    }

    setStatus("동기화 중");
    const timer = window.setTimeout(() => {
      set(ref(database, TIME_BLOCK_PATH), {
        headers,
        rows,
        updatedAt: new Date().toISOString(),
      })
        .then(() => setStatus("동기화됨"))
        .catch(() => setStatus("동기화 실패"));
    }, SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [headers, rows]);

  return status;
}
