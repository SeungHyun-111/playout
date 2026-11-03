import { useEffect, useState } from "react";
import ChiikawaHelper from "./ChiikawaHelper.jsx";

export default function CoachTour({ steps }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[stepIndex];

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = event => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setStepIndex(0);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !step) return undefined;

    const updateRect = () => {
      const target = document.querySelector(step.target);
      if (!target) {
        setRect(null);
        return;
      }

      const nextRect = target.getBoundingClientRect();
      const visibleTop = Math.max(12, nextRect.top);
      const visibleLeft = Math.max(12, nextRect.left);
      const visibleRight = Math.min(window.innerWidth - 12, nextRect.right);
      const visibleBottom = Math.min(window.innerHeight - 12, nextRect.bottom);
      const visibleWidth = Math.max(80, visibleRight - visibleLeft);
      const visibleHeight = Math.max(40, visibleBottom - visibleTop);

      setRect({
        top: visibleTop,
        left: visibleLeft,
        width: Math.min(visibleWidth, step.maxWidth ?? 420),
        height: Math.min(visibleHeight, step.maxHeight ?? 120),
      });
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen, step]);

  const close = () => {
    setIsOpen(false);
    setStepIndex(0);
  };

  const next = () => {
    if (stepIndex >= steps.length - 1) {
      close();
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const cardTop = rect
    ? rect.top + rect.height + 14 > window.innerHeight - 170
      ? Math.max(18, rect.top - 160)
      : rect.top + rect.height + 14
    : 110;

  return (
    <>
      <ChiikawaHelper paused={isOpen} onClick={() => { setStepIndex(0); setIsOpen(true); }} />

      {isOpen && (
        <div className="tour-layer" role="dialog" aria-modal="true" aria-label="기능 도움말">
          <div className="tour-backdrop" onClick={close} />
          {rect && (
            <div
              className="tour-highlight"
              style={{
                top: rect.top - 5,
                left: rect.left - 5,
                width: rect.width + 10,
                height: rect.height + 10,
              }}
            />
          )}
          <div
            className="tour-card"
            style={{
              top: cardTop,
              left: rect ? Math.max(12, Math.min(window.innerWidth - 330, Math.max(18, rect.left))) : Math.max(12, Math.min(260, window.innerWidth - 330)),
            }}
          >
            <div className="tour-count">
              {stepIndex + 1} / {steps.length}
            </div>
            <strong>{step.title}</strong>
            <p>{step.description}</p>
            <div className="tour-actions">
              <button type="button" onClick={close}>
                닫기
              </button>
              <button type="button" onClick={next}>
                {stepIndex >= steps.length - 1 ? "완료" : "다음"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
