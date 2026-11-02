/* Streamlit component bridge: size the frame to all content, not the screen.
   Streamlit's custom-component iframe has scrolling="no", so a fixed height
   clips long analyses. The outer Streamlit page provides vertical scrolling. */
(() => {
  const send = (type, extra = {}) => window.parent.postMessage(
    {isStreamlitMessage: true, type, ...extra}, "*");

  // Remove the viewport-based minimum before measuring: otherwise the iframe's
  // own changing height feeds back into the height of short pages.
  const style = document.createElement("style");
  style.textContent = "main { min-height: 0 !important; } " +
    "@media (min-width: 801px) { .sidebar { position: absolute; } }";
  document.head.appendChild(style);

  let lastHeight = -1;
  let pending = false;
  const resize = () => {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => {
      pending = false;
      // body has auto height, unlike scrollHeight which includes the viewport
      // floor and would prevent shrinking after leaving a long analysis.
      const height = Math.max(720, Math.ceil(document.body.getBoundingClientRect().height) + 2);
      if (height !== lastHeight) {
        lastHeight = height;
        send("streamlit:setFrameHeight", {height});
      }
    });
  };
  window.addEventListener("message", event => {
    if (event.source === window.parent && event.data?.type === "streamlit:render") resize();
  });
  send("streamlit:componentReady", {apiVersion: 1});
  new ResizeObserver(resize).observe(document.body);
  new MutationObserver(resize).observe(document.body, {
    subtree: true, childList: true, characterData: true, attributes: true
  });
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("load", resize);
  document.fonts?.ready.then(resize);
})();
