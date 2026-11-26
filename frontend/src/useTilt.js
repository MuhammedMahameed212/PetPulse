// Pet cards lean toward the mouse in 3D. Mouse only (touch has no hover), and off with reduced motion.
import { useRef } from "react";
import { tiltAt } from "./fx3d";

const MAX_DEG = 6;
const canTilt = () =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Pointer handlers for one card. Writes the card's own transform (no parent CSS variables),
 *  and keeps the lift + press feedback the CSS gives cards without tilt. */
export default function useTilt() {
  const st = useRef({ rx: 0, ry: 0, pressed: false });

  function paint(el) {
    const { rx, ry, pressed } = st.current;
    el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px) scale(${pressed ? 0.97 : 1})`;
  }

  return {
    onPointerMove(e) {
      if (e.pointerType !== "mouse" || !canTilt()) return;
      const t = tiltAt(e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY, MAX_DEG);
      Object.assign(st.current, { rx: t.rx, ry: t.ry });
      e.currentTarget.style.setProperty("--gx", `${t.gx}%`);
      e.currentTarget.style.setProperty("--gy", `${t.gy}%`);
      paint(e.currentTarget);
    },
    onPointerDown(e) {
      if (e.pointerType !== "mouse" || !canTilt()) return;
      st.current.pressed = true;
      paint(e.currentTarget);
    },
    onPointerUp(e) {
      if (e.pointerType !== "mouse" || !canTilt()) return;
      st.current.pressed = false;
      paint(e.currentTarget);
    },
    onPointerLeave(e) {
      st.current = { rx: 0, ry: 0, pressed: false };
      e.currentTarget.style.transform = ""; // back to the stylesheet; the transition eases it flat
    },
  };
}
