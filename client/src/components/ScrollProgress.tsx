import { m, useReducedMotion, useScroll } from "framer-motion";

export default function ScrollProgress() {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  if (reducedMotion) return null;

  return <m.div className="scroll-progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />;
}
