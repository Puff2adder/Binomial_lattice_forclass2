/* Minimal Streamlit custom-component protocol. No financial calculations here. */
(() => {
  const send = (type, extra = {}) => window.parent.postMessage(
    {isStreamlitMessage: true, type, ...extra}, "*");
  const resize = () => send("streamlit:setFrameHeight", {
    height: Math.min(1100, Math.max(720, window.screen.availHeight - 180))
  });
  window.addEventListener("message", event => {
    if (event.source === window.parent && event.data?.type === "streamlit:render") resize();
  });
  send("streamlit:componentReady", {apiVersion: 1});
  resize();
  window.addEventListener("resize", resize);
})();
