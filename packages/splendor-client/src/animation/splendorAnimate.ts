import anime from "animejs";

export function pulseElement(el: Element): void {
  anime({
    targets: el,
    scale: [1, 1.06, 1],
    duration: 350,
    easing: "easeOutQuad",
  });
}

export function animateTokenFlash(el: Element): void {
  anime({
    targets: el,
    opacity: [1, 0.4, 1],
    duration: 500,
    easing: "linear",
  });
}
