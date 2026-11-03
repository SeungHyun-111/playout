import { useEffect, useRef } from "react";

export default function ChiikawaHelper({ onClick, paused }) {
  const buttonRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(false);
  const positionRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const image = new Image();
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let request;
    let disposed = false;
    let previous = 0;
    let nextAction = 0;
    let direction = -1;
    let walking = true;
    if (!positionRef.current) positionRef.current = { x: Math.max(8, window.innerWidth - 160), y: Math.max(8, window.innerHeight - 160) };
    let vy = -0.15;
    const draw = now => {
      if (disposed) return;
      const dt = Math.min((now - previous) / 1000 || 0, 0.05);
      previous = now;
      let { x, y } = positionRef.current;
      const stopped = paused || hoverRef.current || dragRef.current || reduced.matches;
      if (!stopped && now > nextAction) {
        walking = Math.random() > 0.25;
        direction = Math.random() > 0.5 ? 1 : -1;
        vy = (Math.random() - 0.5) * 0.7;
        nextAction = now + 2500 + Math.random() * 3500;
      }
      if (!stopped && walking) {
        x += direction * dt * 42;
        y += vy * dt * 42;
        if (x < 8 || x > window.innerWidth - 120) direction *= -1;
        if (y < 8 || y > window.innerHeight - 150) vy *= -1;
      }
      x = Math.max(8, Math.min(x, window.innerWidth - 120));
      y = Math.max(8, Math.min(y, window.innerHeight - 150));
      positionRef.current = { x, y };
      buttonRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const row = hoverRef.current ? 3 : !stopped && walking ? direction > 0 ? 1 : 2 : 0;
      const count = row === 3 ? 4 : row === 0 ? 6 : 8;
      const frame = reduced.matches ? 0 : Math.floor(now / 140) % count;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, frame * 192, row * 208, 192, 208, 0, 0, 192, 208);
      request = requestAnimationFrame(draw);
    };
    image.onload = () => { if (!disposed) request = requestAnimationFrame(draw); };
    image.src = `${import.meta.env.BASE_URL}pets/chiikawa.png`;
    return () => { disposed = true; cancelAnimationFrame(request); };
  }, [paused]);

  const finishDrag = event => {
    if (dragRef.current?.id !== event.pointerId) return;
    suppressClickRef.current = dragRef.current.moved;
    dragRef.current = null;
    buttonRef.current.style.cursor = "grab";
    if (buttonRef.current.hasPointerCapture(event.pointerId)) buttonRef.current.releasePointerCapture(event.pointerId);
  };

  return <button ref={buttonRef} className="chiikawa-wanderer" type="button" aria-label="치이카와: 클릭하면 도움말, 드래그하면 위치 이동" onClick={event => {
    if (suppressClickRef.current && event.detail !== 0) { suppressClickRef.current = false; return; }
    onClick();
  }}
    onPointerDown={event => {
      if (event.button !== 0 || !positionRef.current) return;
      suppressClickRef.current = false;
      dragRef.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, ...positionRef.current, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.style.cursor = "grabbing";
    }}
    onPointerMove={event => {
      const drag = dragRef.current;
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      if (!drag.moved) return;
      const x = Math.max(8, Math.min(drag.x + dx, window.innerWidth - 120));
      const y = Math.max(8, Math.min(drag.y + dy, window.innerHeight - 150));
      positionRef.current = { x, y };
      event.currentTarget.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }}
    onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={() => { dragRef.current = null; }}
    onPointerEnter={() => { hoverRef.current = true; }} onPointerLeave={() => { hoverRef.current = false; }} onFocus={() => { hoverRef.current = true; }} onBlur={() => { hoverRef.current = false; }}>
    <canvas ref={canvasRef} width="192" height="208" aria-hidden="true" />
  </button>;
}
