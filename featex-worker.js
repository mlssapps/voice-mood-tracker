// Runs the voice-feature math off the main thread so the screen stays smooth.
importScripts('mel.js', 'featex.js');
onmessage = e => {
  const {data, chunks} = computeFeatures(e.data.audio, (c, n) => postMessage({progress: c / n}));
  postMessage({done: true, data, chunks}, [data.buffer]);
};
